/* @flow */

import {defn, defonce} from 'ud';
import EventEmitter from '../../lib/safe-event-emitter';
import type Membrane from '../../lib/Membrane';
import kefirCast from 'kefir-cast';
import Kefir from 'kefir';
import ContentPanelView from '../content-panel-view';
import get from '../../../common/get-or-fail';
import type MessageView from './message-view';
import type {Driver, ThreadViewDriver} from '../../driver-interfaces/driver';

const memberMap = defonce(module, () => new WeakMap());

// documented in src/docs/
class ThreadView extends EventEmitter {
	destroyed: boolean = false;

	constructor(threadViewImplementation: ThreadViewDriver, appId: string, driver: Driver, membrane: Membrane) {
		super();

		const members = {threadViewImplementation, appId, driver, membrane};
		memberMap.set(this, members);

		_bindToStreamEvents(this, threadViewImplementation);
	}

	addSidebarContentPanel(descriptor: Object): ?ContentPanelView {
		const descriptorPropertyStream = kefirCast((Kefir: any), descriptor).toProperty();
		const members = get(memberMap, this);

		members.driver.getLogger().eventSdkPassive('threadView.addSidebarContentPanel');

		const contentPanelImplementation = members.threadViewImplementation.addSidebarContentPanel(descriptorPropertyStream);
		if(contentPanelImplementation){
			return new ContentPanelView(contentPanelImplementation);
		}

		return null;
	}

	getMessageViews(): Array<MessageView> {
		const {threadViewImplementation, membrane} = get(memberMap, this);

		return threadViewImplementation.getMessageViewDrivers()
			.filter(messageViewDriver => messageViewDriver.isLoaded())
			.map(messageViewDriver => membrane.get(messageViewDriver));
	}

	getMessageViewsAll(): Array<MessageView> {
		const {threadViewImplementation, membrane} = get(memberMap, this);

		return threadViewImplementation.getMessageViewDrivers()
			.map(messageViewDriver => membrane.get(messageViewDriver));
	}

	getSubject(): string {
		return get(memberMap, this).threadViewImplementation.getSubject();
	}

	getThreadID(): string {
		// TODO mark deprecated
		return get(memberMap, this).threadViewImplementation.getThreadID();
	}

	getThreadIDAsync(): Promise<string> {
		return get(memberMap, this).threadViewImplementation.getThreadIDAsync();
	}
}

export default defn(module, ThreadView);

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
			const {membrane} = get(memberMap, threadView);
			threadView.emit(event.eventName, {
				contactType: event.contactType,
				messageView: membrane.get(event.messageViewDriver),
				contact: event.contact,
				threadView: threadView
			});
		});
}
