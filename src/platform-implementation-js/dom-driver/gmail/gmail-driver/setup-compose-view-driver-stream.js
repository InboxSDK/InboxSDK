var Bacon = require('baconjs');
var streamWaitFor = require('../../../lib/stream-wait-for');

var dispatchCustomEvent = require('../../../lib/dom/dispatch-custom-event');

var makeElementChildStream = require('../../../lib/dom/make-element-child-stream');
var makeElementViewStream = require('../../../lib/dom/make-element-view-stream');
var makeElementStreamMerger = require('../../../lib/dom/make-element-stream-merger');
var GmailElementGetter = require('../gmail-element-getter');

var GmailComposeView = require('../views/gmail-compose-view');

function setupComposeViewDriverStream(gmailDriver, messageViewDriverStream, xhrInterceptorStream){
	return Bacon.fromPromise(
		GmailElementGetter.waitForGmailModeToSettle()
	).flatMap(function() {
		let elementStream;
		let isStandalone = false;

		if (GmailElementGetter.isStandaloneComposeWindow()) {
			elementStream = _setupStandaloneComposeElementStream();
			isStandalone = true;
		} else {
			elementStream = _setupStandardComposeElementStream();
		}

		return elementStream.flatMap(makeElementViewStream(function(el) {
			let composeView = new GmailComposeView(el, xhrInterceptorStream);
			composeView.setIsStandalone(isStandalone);

			return composeView;
		}));
	}).merge(
		messageViewDriverStream.flatMap(function(gmailMessageView){
			return gmailMessageView.getReplyElementStream().flatMap(makeElementViewStream(function(el) {
				var view = new GmailComposeView(el, xhrInterceptorStream);
				view.setIsInlineReplyForm(true);
				return view;
			}));
		})
	).flatMap(_waitForReady);
}

function _setupStandardComposeElementStream() {
	return _waitForContainerAndMonitorChildrenStream(function() {
		return GmailElementGetter.getComposeWindowContainer();
	}).flatMap(function(composeGrandParent) {
		var composeParentEl = composeGrandParent.el.querySelector('div.AD');
		if (composeParentEl) {
			return makeElementChildStream(composeParentEl)
					.takeUntil(composeGrandParent.removalStream)
					.doAction(_informElement('composeFullscreenStateChanged'));
		} else {
			return Bacon.never();
		}
	}).merge(
		_waitForContainerAndMonitorChildrenStream(function() {
			return GmailElementGetter.getFullscreenComposeWindowContainer();
		})
		.doAction(_informElement('composeFullscreenStateChanged'))
	).map(function(event) {
		return {
			removalStream: event.removalStream,
			el: event.el.querySelector('[role=dialog]')
		};
	}).filter(function(event) {
		return event && event.el;
	}).flatMap(makeElementStreamMerger());
}

function _setupStandaloneComposeElementStream() {
	return _waitForContainerAndMonitorChildrenStream(function() {
		return GmailElementGetter.StandaloneCompose.getComposeWindowContainer();
	});
}

function _waitForContainerAndMonitorChildrenStream(containerFn) {
	return streamWaitFor(function() {
		return containerFn();
	}).flatMap(function(containerEl) {
		return makeElementChildStream(containerEl);
	});
}

function _informElement(eventName){
	return function(event){
		if(event && event.el && event.el.querySelector('[role=dialog]')){
			var composeEl = event.el.querySelector('[role=dialog]');
			if(composeEl){
				dispatchCustomEvent(composeEl, eventName);
			}
		}
	};
}


function _waitForReady(composeView){
	return Bacon.fromPromise(composeView.ready());
}

module.exports = setupComposeViewDriverStream;
