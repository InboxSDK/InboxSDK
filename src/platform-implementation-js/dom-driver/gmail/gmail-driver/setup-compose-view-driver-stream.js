var Bacon = require('baconjs');
var waitFor = require('../../../lib/wait-for');

var makeElementChildStream = require('../../../lib/dom/make-element-child-stream');
var makeElementViewStream = require('../../../lib/dom/make-element-view-stream');
var GmailElementGetter = require('../gmail-element-getter');

var GmailComposeView = require('../views/gmail-compose-view');

function setupComposeViewDriverStream(gmailDriver, messageViewDriverStream){
	return Bacon.fromPromise(
		GmailElementGetter.waitForGmailModeToSettle()
	).flatMap(function() {
		var elementStream;
		if (GmailElementGetter.isStandaloneComposeWindow()) {
			elementStream = _setupStandaloneComposeElementStream();
		} else {
			elementStream = _setupStandardComposeElementStream();
		}

		return makeElementViewStream({
			elementStream: elementStream,
			viewFn: function(el) {
				return new GmailComposeView(el);
			}
		});
	}).merge(
		messageViewDriverStream.flatMap(function(gmailMessageView){
			return gmailMessageView.getEventStream().filter(function(event){
				return event.eventName === 'replyOpen';
			}).map('.view');
		})
	);
}

function _waitForContainerAndMonitorChildrenStream(containerFn) {
	var containerEl;
	return Bacon.fromPromise(
		waitFor(function() {
			containerEl = containerFn();
			return !!containerEl;
		})
	).flatMap(function() {
		return makeElementChildStream(containerEl);
	});
}

function _setupStandardComposeElementStream() {
	return _waitForContainerAndMonitorChildrenStream(function() {
		return GmailElementGetter.getComposeWindowContainer();
	}).merge(
		_waitForContainerAndMonitorChildrenStream(function() {
			return GmailElementGetter.getFullscreenComposeWindowContainer();
		})
	).filter(function(event) {
		return !event.el.classList.contains('aJl');
	}).map(function(event) {
		return {
			type: event.type,
			el: event.el.querySelector('[role=dialog]')
		};
	}).filter(function(event) {
		return event && event.el;
	});
}

function _setupStandaloneComposeElementStream() {
	return _waitForContainerAndMonitorChildrenStream(function() {
		return GmailElementGetter.StandaloneCompose.getComposeWindowContainer();
	});
}

module.exports = setupComposeViewDriverStream;
