var Bacon = require('baconjs');
var waitFor = require('../../../lib/wait-for');

var ElementMonitor = require('../../../lib/dom/element-monitor');
var GmailElementGetter = require('../gmail-element-getter');

var GmailComposeView = require('../views/gmail-compose-view');

function setupComposeViewDriverStream(gmailDriver){

	gmailDriver._composeViewDriverStream = new Bacon.Bus();

	GmailElementGetter.waitForGmailModeToSettle().then(function(){
		if(GmailElementGetter.isStandaloneComposeWindow()){
			_setupStandaloneComposeViewDriverStream(gmailDriver);
		}
		else{
			_setupStandardComposeViewDriverStream(gmailDriver);
			_setupFullscreenComposeViewDriverStream(gmailDriver);
		}

		gmailDriver._composeViewDriverStream.plug(gmailDriver._composeElementMonitor.getViewAddedEventStream());
		gmailDriver._composeViewDriverStream.plug(gmailDriver._fullscreenComposeElementMonitor.getViewAddedEventStream());
	});


	gmailDriver._composeViewDriverStream.plug(
		gmailDriver._messageViewDriverStream.flatMap(function(gmailMessageView){
			return gmailMessageView.getEventStream().filter(function(event){
				return event.eventName === 'replyOpen';
			})
			.map(function(event){
				return event.view;
			});
		})
	);
}

function _setupStandaloneComposeViewDriverStream(gmailDriver){
	gmailDriver._composeElementMonitor = new ElementMonitor({
		relevantElementExtractor: function(element){
			return element;
		},

		viewCreationFunction: function(element){
			return new GmailComposeView(element);
		}
	});


	waitFor(function(){
		return !!GmailElementGetter.StandaloneCompose.getComposeWindowContainer();
	}).then(function(){
		var composeContainer = GmailElementGetter.StandaloneCompose.getComposeWindowContainer();
		gmailDriver._composeElementMonitor.setObservedElement(GmailElementGetter.StandaloneCompose.getComposeWindowContainer());
	});
}

function _setupStandardComposeViewDriverStream(gmailDriver){
	gmailDriver._composeElementMonitor = new ElementMonitor({
		relevantElementExtractor: function(element){
			if(element.classList.contains('aJl')){
				return null;
			}

			return element.querySelector('[role=dialog]');
		},

		viewCreationFunction: function(element){
			return new GmailComposeView(element);
		}
	});

	waitFor(function(){
		return !!GmailElementGetter.getComposeWindowContainer();
	}).then(function(){
		var composeContainer = GmailElementGetter.getComposeWindowContainer();
		gmailDriver._composeElementMonitor.setObservedElement(composeContainer);
	});
}

function _setupFullscreenComposeViewDriverStream(gmailDriver){
	gmailDriver._fullscreenComposeElementMonitor = new ElementMonitor({
		relevantElementExtractor: function(element){
			return element.querySelector('[role=dialog]');
		},

		viewCreationFunction: function(element){
			return new GmailComposeView(element);
		}
	});

	waitFor(function(){
		return !!GmailElementGetter.getFullscreenComposeWindowContainer();
	}).then(function(){
		var fullscreenComposeContainer = GmailElementGetter.getFullscreenComposeWindowContainer();
		gmailDriver._fullscreenComposeElementMonitor.setObservedElement(fullscreenComposeContainer);
	});
}


module.exports = setupComposeViewDriverStream;
