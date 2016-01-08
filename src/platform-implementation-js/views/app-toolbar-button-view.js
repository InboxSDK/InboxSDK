/* @flow */

import _ from 'lodash';
import EventEmitter from '../lib/safe-event-emitter';
import type {Driver} from '../driver-interfaces/driver';
import type GmailAppToolbarButtonView from '../dom-driver/gmail/views/gmail-app-toolbar-button-view';

const memberMap = new WeakMap();

// Documented in src/docs/app-toolbar-button-view.js
export default class AppToolbarButtonView extends EventEmitter {
	destroyed: boolean;

	constructor(driver: Driver, appToolbarButtonViewDriverPromise: Promise<GmailAppToolbarButtonView>) {
		super();
		const members = {
			appToolbarButtonViewDriverPromise,
			appToolbarButtonViewDriver: (null: ?GmailAppToolbarButtonView)
		};
		memberMap.set(this, members);

		this.destroyed = false;
		members.appToolbarButtonViewDriverPromise.then(appToolbarButtonViewDriver => {
			members.appToolbarButtonViewDriver = appToolbarButtonViewDriver;
			appToolbarButtonViewDriver.getStopper().onValue(() => {
				this.destroyed = true;
				this.emit('destroy');
			});
		});

		driver.getStopper().onValue(() => {
			this.remove();
		});
	}

	open() {
		var members = memberMap.get(this);
		members.appToolbarButtonViewDriverPromise.then(function(appToolbarButtonViewDriver){
			appToolbarButtonViewDriver.open();
		});
	}

	close() {
		var members = memberMap.get(this);
		members.appToolbarButtonViewDriverPromise.then(function(appToolbarButtonViewDriver){
			appToolbarButtonViewDriver.close();
		});
	}

	remove() {
		var members = memberMap.get(this);
		members.appToolbarButtonViewDriverPromise.then(function(appToolbarButtonViewDriver){
			appToolbarButtonViewDriver.destroy();
		});
	}
}
