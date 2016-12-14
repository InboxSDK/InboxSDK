/* @flow */

import _ from 'lodash';
import EventEmitter from '../lib/safe-event-emitter';
import get from '../../common/get-or-fail';
import type {Driver} from '../driver-interfaces/driver';

import type GmailAppToolbarButtonView from '../dom-driver/gmail/views/gmail-app-toolbar-button-view';
import type InboxAppToolbarButtonView from '../dom-driver/inbox/views/inbox-app-toolbar-button-view';

type AppToolbarButtonViewDriver = GmailAppToolbarButtonView|InboxAppToolbarButtonView;

const memberMap = new WeakMap();

// Documented in src/docs/app-toolbar-button-view.js
export default class AppToolbarButtonView extends EventEmitter {
	destroyed: boolean;

	constructor(driver: Driver, appToolbarButtonViewDriverPromise: Promise<AppToolbarButtonViewDriver>) {
		super();
		const members = {
			appToolbarButtonViewDriverPromise,
			appToolbarButtonViewDriver: (null: ?AppToolbarButtonViewDriver)
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
		const members = get(memberMap, this);
		members.appToolbarButtonViewDriverPromise.then(function(appToolbarButtonViewDriver){
			appToolbarButtonViewDriver.open();
		});
	}

	close() {
		const members = get(memberMap, this);
		members.appToolbarButtonViewDriverPromise.then(function(appToolbarButtonViewDriver){
			appToolbarButtonViewDriver.close();
		});
	}

	remove() {
		const members = get(memberMap, this);
		members.appToolbarButtonViewDriverPromise.then(function(appToolbarButtonViewDriver){
			appToolbarButtonViewDriver.destroy();
		});
	}
}
