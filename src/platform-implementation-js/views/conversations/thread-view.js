/* @flow */

import _ from 'lodash';
import {defn, defonce} from 'ud';
import EventEmitter from '../../lib/safe-event-emitter';
import baconCast from 'bacon-cast';
import Bacon from 'baconjs';
import Logger from '../../lib/logger';

import ContentPanelView from '../content-panel-view';

import type MessageView from './message-view';
import type GmailThreadView from '../../dom-driver/gmail/views/gmail-thread-view';

const memberMap = defonce(module, () => new WeakMap());

// documented in src/docs/
class ThreadView extends EventEmitter {
	destroyed: boolean = false;

	constructor(threadViewImplementation: GmailThreadView, appId: string, membraneMap: WeakMap) {
		super();

		const members = {threadViewImplementation, appId, membraneMap};
		memberMap.set(this, members);

		_bindToStreamEvents(this, threadViewImplementation);
	}

	addSidebarContentPanel(descriptor: Object): ?ContentPanelView {
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
	}

	getMessageViews(): Array<MessageView> {
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
	}

	getMessageViewsAll(): Array<MessageView> {
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
	}

	getSubject(): string {
		return memberMap.get(this).threadViewImplementation.getSubject();
	}

	getThreadID(): string {
		return memberMap.get(this).threadViewImplementation.getThreadID();
	}
}

export default defn(module, ThreadView);

function logAboutMissingMV(threadViewDriver, messageViewDriver) {
	try {
		Logger.error(new Error("missing messageview"), {
			messageViewDriver: {
				hasElement: !!messageViewDriver.getElement(),
				isLoaded: messageViewDriver.isLoaded()
			},
			threadViewDriver: {
				eventStreamEnded: (threadViewDriver.getEventStream():any).ended,
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
