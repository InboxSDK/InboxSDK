var _ = require('lodash');
var EventEmitter = require('../../lib/safe-event-emitter');
var baconCast = require('bacon-cast');
var Bacon = require('baconjs');
import Logger from '../../lib/logger';

var ContentPanelView = require('../content-panel-view');

var memberMap = new WeakMap();

// documented in src/docs/
var ThreadView = function(threadViewImplementation, appId, membraneMap){
	EventEmitter.call(this);

	var members = {};
	memberMap.set(this, members);

	members.threadViewImplementation = threadViewImplementation;
	members.appId = appId;
	members.membraneMap = membraneMap;

	this.destroyed = false;

	_bindToStreamEvents(this, threadViewImplementation);
};

ThreadView.prototype = Object.create(EventEmitter.prototype);

_.extend(ThreadView.prototype, {

	addSidebarContentPanel(descriptor){
		var descriptorPropertyStream = baconCast(Bacon, descriptor).toProperty();
		var members = memberMap.get(this);

		if(!members){
			return null;
		}

		var contentPanelImplementation = members.threadViewImplementation.addSidebarContentPanel(descriptorPropertyStream, members.appId);
		if(contentPanelImplementation){
			return new ContentPanelView(contentPanelImplementation);
		}

		return null;
	},

	getMessageViews(){
		var members = memberMap.get(this);

		return _.chain(members.threadViewImplementation.getMessageViewDrivers())
			.filter(function(messageViewDriver){
				return messageViewDriver.isLoaded();
			})
			.map(function(messageViewDriver){
				var messageView = members.membraneMap.get(messageViewDriver);
				if (!messageView) {
					logAboutMissingMV(members.threadViewImplementation, messageViewDriver);
				}
				return messageView;
			})
			.filter(Boolean)
			.value();
	},

	getMessageViewsAll(){
		var members = memberMap.get(this);

		return _.chain(members.threadViewImplementation.getMessageViewDrivers())
			.map(function(messageViewDriver){
				var messageView = members.membraneMap.get(messageViewDriver);
				if (!messageView) {
					logAboutMissingMV(members.threadViewImplementation, messageViewDriver);
				}
				return messageView;
			})
			.filter(Boolean)
			.value();
	},

	getSubject(){
		return memberMap.get(this).threadViewImplementation.getSubject();
	},

	getThreadID(){
		return memberMap.get(this).threadViewImplementation.getThreadID();
	},

});

module.exports = ThreadView;

function logAboutMissingMV(threadViewDriver, messageViewDriver) {
	try {
		Logger.error(new Error("missing messageview"), {
			messageViewDriver: {
				hasElement: !!messageViewDriver.getElement(),
				isLoaded: messageViewDriver.isLoaded()
			},
			threadViewDriver: {
				eventStreamEnded: threadViewDriver.getEventStream().ended,
				messagesCount: threadViewDriver.getMessageViewDrivers().length
			}
		});
	} catch(err) {
		Logger.error(err);
	}
}

function _bindToStreamEvents(threadView, threadViewImplementation){
	threadViewImplementation.getEventStream().onEnd(function(){
		threadView.destroyed = true;
		threadView.emit('destroy');

		threadView.removeAllListeners();
	});

	threadViewImplementation
		.getEventStream()
		.filter(function(event){
			return event.type !== 'internal' && event.eventName === 'contactHover';
		})
		.onValue(function(event){
			threadView.emit(event.eventName, {
				contactType: event.contactType,
				messageView: memberMap.get(threadView).membraneMap.get(event.messageViewDriver),
				contact: event.contact,
				threadView: threadView
			});
		});
}
