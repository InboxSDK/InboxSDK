/* @flow */
// jshint ignore:start

import _ from 'lodash';
import SafeEventEmitter from './lib/safe-event-emitter';

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

import HMRManager from '../common/hmr-manager';
import GmailDriver from './dom-driver/gmail/gmail-driver';
import InboxDriver from './dom-driver/inbox/inbox-driver';
import Logger from './lib/logger';

import isValidAppId from './lib/is-valid-app-id';

// Some types
import type {Driver} from './driver-interfaces/driver';
import type {AppLogger} from './lib/logger';

var loadedAppIds: Set<string> = new Set();

export class PlatformImplementation extends SafeEventEmitter {
	_driver: Driver;
	_appId: string;
	_membraneMap: WeakMap<Object, Object>;
	destroyed: boolean;
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

	constructor(driver: Driver, appId: string, appName: ?string, appIconUrl: ?string, LOADER_VERSION: string) {
		super();
		this._appId = appId;
		this._driver = driver;
		this._membraneMap = new WeakMap();
		this.destroyed = false;
		this.LOADER_VERSION = LOADER_VERSION;
		this.IMPL_VERSION = process.env.VERSION;

		this.ButterBar = new ButterBar(appId, driver, this._membraneMap);
		driver.setButterBar(this.ButterBar);

		this.Compose = new Compose(appId, driver, this._membraneMap);
		this.Conversations = new Conversations(appId, driver, this._membraneMap);
		this.Keyboard = new Keyboard(appId, appName, appIconUrl, driver, this._membraneMap);
		this.User = new User(appId, driver, this._membraneMap);
		this.Lists = new Lists(appId, driver, this._membraneMap);
		this.NavMenu = new NavMenu(appId, driver, this._membraneMap);
		this.Router = new Router(appId, driver, this._membraneMap);
		this.Search = new Search(appId, driver, this._membraneMap);
		this.Toolbars = new Toolbars(appId, driver, this._membraneMap);
		this.Widgets = new Widgets(appId, driver, this._membraneMap);
		this.Modal = new Modal(appId, driver, this._membraneMap);
		this.Logger = driver.getLogger().getAppLogger();
	}

	destroy() {
		if (!this.destroyed) {
			this.destroyed = true;
			this._driver.destroy();
			this.emit('destroy');
		}
	}
}

export type EnvData = {
	piMainStarted: number;
	piLoadStarted: number;
	wasAccountSwitcherReadyAtStart: boolean;
};

// returns a promise for the PlatformImplementation object
export function makePlatformImplementation(appId: string, opts: any, envData: EnvData): Promise<PlatformImplementation> {
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
		'https://inbox.google.com': InboxDriver
	};

	var LOADER_VERSION: string = opts.VERSION;
	var IMPL_VERSION: string = process.env.VERSION;
	var logger = new Logger(appId, opts, LOADER_VERSION, IMPL_VERSION);
	HMRManager.startWatch();

	var origin: string = (document.location: any).origin;
	var DriverClass = DRIVERS_BY_ORIGIN[origin];
	if (!DriverClass) {
		console.log("InboxSDK: Unsupported origin", origin);
		// never resolve
		return new Promise((resolve, reject) => {});
	}

	var driver: Driver = new DriverClass(appId, opts, LOADER_VERSION, IMPL_VERSION, logger, envData);
	return (driver.onready: any /* work around https://github.com/facebook/flow/issues/683 */).then(() => {
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

		logger.eventSdkPassive('instantiate');
		var pi = new PlatformImplementation(driver, appId, opts.appName, opts.appIconUrl, opts.VERSION);
		if (origin === 'https://inbox.google.com' && !opts.inboxBeta) {
			console.log("InboxSDK: Unsupported origin", origin);
			if (!loadedAppIds.has(appId)) {
				loadedAppIds.add(appId);
				logger.eventSdkPassive('not load');
			}
			// never resolve and give pi to app
			return new Promise((resolve, reject) => {});
		}
		if (!loadedAppIds.has(appId)) {
			loadedAppIds.add(appId);
			logger.eventSdkPassive('load');
		}
		return pi;
	});
}
