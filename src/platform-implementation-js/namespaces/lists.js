/* @flow */

import _ from 'lodash';

import HandlerRegistry from '../lib/handler-registry';
import ThreadRowView from '../views/thread-row-view';
import type {Driver} from '../driver-interfaces/driver';

const memberMap = new WeakMap();

// documented in src/docs/
export default class Lists {
	ActionButtonTypes = ActionButtonTypes;

	constructor(appId: string, driver: Driver, membraneMap: WeakMap<Object,Object>){
		const members = {
			appId, driver, membraneMap,
			threadRowViewRegistry: new HandlerRegistry()
		};
		memberMap.set(this, members);

		driver.getStopper().onValue(() => {
			members.threadRowViewRegistry.dumpHandlers();
		});

		members.driver.getThreadRowViewDriverStream().onValue(viewDriver => {
			var view = membraneMap.get(viewDriver);
			if(!view){
				view = new ThreadRowView(viewDriver);
				membraneMap.set(viewDriver, view);
			}

			members.threadRowViewRegistry.addTarget(view);
		});
	}

	registerThreadRowViewHandler(handler: Function) {
		return memberMap.get(this).threadRowViewRegistry.registerHandler(handler);
	}
}

var ActionButtonTypes = Object.freeze({
	'LINK': 'LINK',
	'DROPDOWN': 'DROPDOWN',
	'ACTION': 'ACTION'
});
