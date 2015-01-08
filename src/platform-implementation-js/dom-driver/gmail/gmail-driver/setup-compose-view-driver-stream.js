var Bacon = require('baconjs');
var streamWaitFor = require('../../../lib/stream-wait-for');

var makeElementChildStream = require('../../../lib/dom/make-element-child-stream');
var makeElementViewStream = require('../../../lib/dom/make-element-view-stream');
var makeElementStreamMerger = require('../../../lib/dom/make-element-stream-merger');
var GmailElementGetter = require('../gmail-element-getter');

var GmailComposeView = require('../views/gmail-compose-view');

function setupComposeViewDriverStream(gmailDriver, messageViewDriverStream, xhrInterceptorStream){
	return Bacon.fromPromise(
		GmailElementGetter.waitForGmailModeToSettle()
	).flatMap(function() {
		var elementStream;
		if (GmailElementGetter.isStandaloneComposeWindow()) {
			elementStream = _setupStandaloneComposeElementStream();
		} else {
			elementStream = _setupStandardComposeElementStream();
		}

		return elementStream.flatMap(makeElementViewStream(function(el) {
			return new GmailComposeView(el, xhrInterceptorStream);
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

function _waitForContainerAndMonitorChildrenStream(containerFn) {
	return streamWaitFor(function() {
		return containerFn();
	}).flatMap(function(containerEl) {
		return makeElementChildStream(containerEl);
	});
}

function _setupStandardComposeElementStream() {
	return _waitForContainerAndMonitorChildrenStream(function() {
		return GmailElementGetter.getComposeWindowContainer();
	}).flatMap(function(composeGrandParent) {
		var composeParentEl = composeGrandParent.el.querySelector('div.AD');
		if (composeParentEl) {
			return makeElementChildStream(composeParentEl).takeUntil(composeGrandParent.removalStream);
		} else {
			return Bacon.never();
		}
	}).merge(
		_waitForContainerAndMonitorChildrenStream(function() {
			return GmailElementGetter.getFullscreenComposeWindowContainer();
		})
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


function _waitForReady(composeView){
	return Bacon.fromPromise(composeView.ready());
}

module.exports = setupComposeViewDriverStream;
