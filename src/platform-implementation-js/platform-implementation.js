/* @flow */
// jshint ignore:start

import _ from 'lodash';

import ButterBar from './platform-implementation/butter-bar';
import Compose from './platform-implementation/compose';
import Conversations from './platform-implementation/conversations';
import Keyboard from './platform-implementation/keyboard.js';
import Widgets from './platform-implementation/widgets';
import Modal from './platform-implementation/modal';
import Lists from './platform-implementation/lists';
import NavMenu from './platform-implementation/nav-menu';
import Router from './platform-implementation/router';
import Search from './platform-implementation/search';
import Toolbars from './platform-implementation/toolbars';
import User from './platform-implementation/user';

import GmailDriver from './dom-driver/gmail/gmail-driver';
import InboxDriver from './dom-driver/inbox/inbox-driver';
import Logger from './lib/logger';

import isValidAppId from './lib/is-valid-app-id';

// Some types
import type {Driver} from './driver-interfaces/driver';
import type {AppLogger} from './lib/logger';
export type PlatformImplementation = {
	LOADER_VERSION: string;
	IMPL_VERSION: string;

	Compose: Compose;
	Conversations: Conversations;
	Keyboard: Keyboard;
	User: User;
	Lists: Lists;
	NavMenu: NavMenu;
	Router: Router;
	Search: Search;
	Toolbars: Toolbars;
	ButterBar: ButterBar;
	Widgets: Widgets;
	Modal: Modal;
	Logger: AppLogger;
};

// returns a promise for the PlatformImplementation object
export default function makePlatformImplementation(appId: string, opts: any): Promise<PlatformImplementation> {
	if (typeof appId !== 'string') {
		throw new Error("appId must be a string");
	}

	opts = _.extend({
		// defaults
		globalErrorLogging: true, eventTracking: true,
		inboxBeta: false
	}, opts);

	opts.REQUESTED_API_VERSION = +opts.REQUESTED_API_VERSION;
	if (opts.REQUESTED_API_VERSION !== 1) {
		throw new Error("InboxSDK: Unsupported API version "+opts.REQUESTED_API_VERSION);
	}

	var DRIVERS_BY_ORIGIN = {
		'https://mail.google.com': GmailDriver,
		'https://inbox.google.com': opts.inboxBeta && InboxDriver
	};

	var LOADER_VERSION: string = opts.VERSION;
	var IMPL_VERSION: string = process.env.VERSION;
	var logger = new Logger(appId, opts, LOADER_VERSION, IMPL_VERSION);

	var origin: string = (document.location: any).origin;
	var DriverClass = DRIVERS_BY_ORIGIN[origin];
	if (!DriverClass) {
		console.log("InboxSDK: Unsupported origin", origin);
		if (origin === 'https://inbox.google.com') {
			logger.eventSdkPassive('not load');
		}
		return new Promise(function(resolve, reject) {
			// never resolve
		});
	}

	var driver: Driver = new DriverClass(appId, opts, LOADER_VERSION, IMPL_VERSION, logger);
	return driver.onready.then(() => {
		logger.eventSdkPassive('load');
		var membraneMap: WeakMap<Object,Object> = new WeakMap();

		if (!isValidAppId(appId)) {
			console.error(`
===========================================================
InboxSDK: You have loaded InboxSDK with an invalid appId:
${appId}
Registering an appId is free. Please see
https://www.inboxsdk.com/docs/#RequiredSetup
===========================================================
`);
			driver.showAppIdWarning();
		}

		if (driver.isRunningInPageContext()) {
			console.warn("Running the InboxSDK outside of an extension content script is not recommended!");
		}

		var butterBar = new ButterBar(appId, driver, membraneMap);
		driver.setButterBar(butterBar);

		return {
			_appId: appId,
			_membraneMap: membraneMap,
			_driver: driver,

			LOADER_VERSION: opts.VERSION,
			IMPL_VERSION: process.env.VERSION,

			Compose: new Compose(appId, driver, membraneMap),
			Conversations: new Conversations(appId, driver, membraneMap),
			Keyboard: new Keyboard(appId, opts.appIconUrl, driver, membraneMap),
			User: new User(appId, driver, membraneMap),
			Lists: new Lists(appId, driver, membraneMap),
			NavMenu: new NavMenu(appId, driver, membraneMap),
			Router: new Router(appId, driver, membraneMap),
			Search: new Search(appId, driver, membraneMap),
			Toolbars: new Toolbars(appId, driver, membraneMap),
			ButterBar: butterBar,
			Widgets: new Widgets(appId, driver, membraneMap),
			Modal: new Modal(appId, driver, membraneMap),
			Logger: driver.getLogger().getAppLogger()
		};
	});
}
