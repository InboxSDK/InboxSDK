/* @flow */

import _ from 'lodash';
import Kefir from 'kefir';

import ThreadView from '../views/conversations/thread-view';
import MessageView from '../views/conversations/message-view';

import HandlerRegistry from '../lib/handler-registry';

import type {Driver} from '../driver-interfaces/driver';

const memberMap = new WeakMap();

export const MessageViewViewStates = Object.freeze({
	"HIDDEN": "HIDDEN",
	"COLLAPSED": "COLLAPSED",
	"EXPANDED": "EXPANDED"
});

export const MessageViewToolbarSectionNames = Object.freeze({
	"MORE": "MORE"
});

// documented in src/docs/
class Conversations {
	MessageViewViewStates: typeof MessageViewViewStates = MessageViewViewStates;
	MessageViewToolbarSectionNames: typeof MessageViewToolbarSectionNames = MessageViewToolbarSectionNames;

	constructor(appId: string, driver: Driver, membraneMap: WeakMap) {
		const members = {
			appId, driver, membraneMap,
			threadViewHandlerRegistry: new HandlerRegistry(),
			messageViewHandlerRegistries: {
				all: new HandlerRegistry(),
				loaded: new HandlerRegistry()
			}
		};
		memberMap.set(this, members);

		driver.getStopper().onValue(() => {
			members.threadViewHandlerRegistry.dumpHandlers();
			members.messageViewHandlerRegistries.all.dumpHandlers();
			members.messageViewHandlerRegistries.loaded.dumpHandlers();
		});

		_setupViewDriverWatcher(appId, driver.getThreadViewDriverStream(), ThreadView, members.threadViewHandlerRegistry, this, membraneMap, driver);
		_setupViewDriverWatcher(appId, driver.getMessageViewDriverStream(), MessageView, members.messageViewHandlerRegistries.all, this, membraneMap, driver);

		_setupViewDriverWatcher(
			appId,
			driver.getMessageViewDriverStream().flatMap(messageViewDriver =>
				messageViewDriver.isLoaded() ?
					Kefir.constant(messageViewDriver) :
					messageViewDriver.getEventStream()
						.filter(event => event.eventName === 'messageLoad')
						.map(() => messageViewDriver)
						.take(1)
			),
			MessageView,
			members.messageViewHandlerRegistries.loaded,
			this,
			membraneMap,
			driver
		);
	}

	registerThreadViewHandler(handler: (v: ThreadView)=>void): ()=>void {
		return memberMap.get(this).threadViewHandlerRegistry.registerHandler(handler);
	}

	registerMessageViewHandler(handler: (v: MessageView)=>void): ()=>void {
		return memberMap.get(this).messageViewHandlerRegistries.loaded.registerHandler(handler);
	}

	registerMessageViewHandlerAll(handler: (v: MessageView)=>void): ()=>void {
		return memberMap.get(this).messageViewHandlerRegistries.all.registerHandler(handler);
	}
}

function _setupViewDriverWatcher(appId, stream, ViewClass, handlerRegistry, ConversationsInstance, membraneMap, driver){
	var combinedStream: Kefir.Stream<Object> = stream.map(function(viewDriver){
		var view = membraneMap.get(viewDriver);
		if (!view) {
			view = new ViewClass((viewDriver:any), appId, membraneMap, ConversationsInstance, driver);
			membraneMap.set(viewDriver, view);
		}
		return {viewDriver, view};
	});

	// A delay is currently necessary so that ThreadView can wait for its MessageViews.
	combinedStream.flatMap(event =>
		event.viewDriver.getReadyStream()
			.map(() => event)
			.takeUntilBy(Kefir.fromEvents(event.view, 'destroy'))
	).onValue(function(event) {
		handlerRegistry.addTarget(event.view);
	});
}

export default Conversations;
