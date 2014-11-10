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
		}

		gmailDriver._composeViewDriverStream.plug(gmailDriver._composeElementMonitor.getViewAddedEventStream());
	});


	gmailDriver._composeViewDriverStream.plug(
		gmailDriver._messageViewDriverStream.flatMapLatest(function(gmailMessageView){
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
		elementMembershipTest: function(element){
			return true;
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
		elementMembershipTest: function(element){
			return element.classList.contains('nn') && element.children.length > 0;
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


module.exports = setupComposeViewDriverStream;
