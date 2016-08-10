/* @flow */
// jshint ignore:start

import _ from 'lodash';
import SafeEventEmitter from './lib/safe-event-emitter';
import {BUILD_VERSION} from '../common/version';
import sharedStyle from './lib/shared-style';
import Membrane from './lib/Membrane';

import AttachmentCardView from './views/conversations/attachment-card-view';
import GmailAttachmentCardView from './dom-driver/gmail/views/gmail-attachment-card-view';
import InboxAttachmentCardView from './dom-driver/inbox/views/inbox-attachment-card-view';

import MessageView from './views/conversations/message-view';
import GmailMessageView from './dom-driver/gmail/views/gmail-message-view';
import InboxMessageView from './dom-driver/inbox/views/inbox-message-view';

import ThreadView from './views/conversations/thread-view';
import GmailThreadView from './dom-driver/gmail/views/gmail-thread-view';
import InboxThreadView from './dom-driver/inbox/views/inbox-thread-view';

import ThreadRowView from './views/thread-row-view';
import GmailThreadRowView from './dom-driver/gmail/views/gmail-thread-row-view';

import ButterBar from './namespaces/butter-bar';
import Compose from './namespaces/compose';
import Conversations from './namespaces/conversations';
import Keyboard from './namespaces/keyboard.js';
import Widgets from './namespaces/widgets';
import Modal from './namespaces/modal';
import Lists from './namespaces/lists';
import NavMenu from './namespaces/nav-menu';
import Router from './namespaces/router';
import Search from './namespaces/search';
import Toolbars from './namespaces/toolbars';
import User from './namespaces/user';

import GmailDriver from './dom-driver/gmail/gmail-driver';
import InboxDriver from './dom-driver/inbox/inbox-driver';
import Logger from './lib/logger';

import isValidAppId from './lib/is-valid-app-id';

// Some types
import type {Driver} from './driver-interfaces/driver';
import type {AppLogger} from './lib/logger';

var loadedAppIds: Set<string> = new Set();

export type PiOpts = {
	appName: ?string;
	appIconUrl: ?string;
	VERSION: string;
	globalErrorLogging: boolean;
	eventTracking: boolean;
	inboxBeta: boolean;
	REQUESTED_API_VERSION: number;
};

export class PlatformImplementation extends SafeEventEmitter {
	_driver: Driver;
	_appId: string;
	_membraneMap: WeakMap<Object, Object>;
	_membrane: Membrane;
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
	Modal: ?Modal;
	Logger: AppLogger;

	constructor(driver: Driver, appId: string, piOpts: PiOpts) {
		super();
		var {appName, appIconUrl, VERSION:LOADER_VERSION} = piOpts;

		this._appId = appId;
		this._driver = driver;
		this._membraneMap = new WeakMap();
		this._membrane = new Membrane([
			[GmailAttachmentCardView, viewDriver => new AttachmentCardView(viewDriver, this._membrane)],
			[InboxAttachmentCardView, viewDriver => new AttachmentCardView(viewDriver, this._membrane)],
			[GmailMessageView, viewDriver => new MessageView(viewDriver, appId, this._membrane, this.Conversations, driver)],
			[InboxMessageView, viewDriver => new MessageView(viewDriver, appId, this._membrane, this.Conversations, driver)],
			[GmailThreadView, viewDriver => new ThreadView(viewDriver, appId, this._membrane)],
			[InboxThreadView, viewDriver => new ThreadView(viewDriver, appId, this._membrane)],
			[GmailThreadRowView, viewDriver => new ThreadRowView(viewDriver)],
		]);
		this.destroyed = false;
		this.LOADER_VERSION = LOADER_VERSION;
		this.IMPL_VERSION = BUILD_VERSION;

		this.ButterBar = new ButterBar(appId, driver);
		driver.setButterBar(this.ButterBar);

		this.Compose = new Compose(appId, driver);
		this.Conversations = new Conversations(appId, driver, this._membrane);
		this.Keyboard = new Keyboard(appId, appName, appIconUrl, driver);
		this.User = new User(driver);
		this.Lists = new Lists(appId, driver, this._membrane);
		this.NavMenu = new NavMenu(appId, driver);
		this.Router = new Router(appId, driver, this._membraneMap);
		this.Search = new Search(appId, driver);
		this.Toolbars = new Toolbars(appId, driver, this._membrane, this._membraneMap);
		this.Widgets = new Widgets(appId, driver);
		if (piOpts.REQUESTED_API_VERSION === 1) {
			// Modal is deprecated; just drop it when apps switch to the next version
			// whenever we start that.
			this.Modal = new Modal(appId, driver, piOpts);
		}
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
export function makePlatformImplementation(appId: string, _opts: Object, envData: EnvData): Promise<PlatformImplementation> {
	if (typeof appId !== 'string') {
		throw new Error("appId must be a string");
	}

	var opts: PiOpts = _.extend({
		// defaults
		globalErrorLogging: true, eventTracking: true,
		inboxBeta: false
	}, _opts);

	opts.REQUESTED_API_VERSION = +opts.REQUESTED_API_VERSION;
	if (opts.REQUESTED_API_VERSION !== 1) {
		throw new Error("InboxSDK: Unsupported API version "+opts.REQUESTED_API_VERSION);
	}

	var DRIVERS_BY_ORIGIN = {
		'https://mail.google.com': GmailDriver,
		'https://inbox.google.com': InboxDriver
	};

	var LOADER_VERSION: string = opts.VERSION;
	var IMPL_VERSION: string = BUILD_VERSION;
	var logger = new Logger(appId, opts, LOADER_VERSION, IMPL_VERSION);

	var origin: string = (document.location: any).origin;
	var DriverClass = DRIVERS_BY_ORIGIN[origin];
	if (!DriverClass) {
		console.log("InboxSDK: Unsupported origin", origin);
		// never resolve
		return new Promise((resolve, reject) => {});
	}

	sharedStyle();

	var driver: Driver = new DriverClass(appId, LOADER_VERSION, IMPL_VERSION, logger, envData);
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
		var pi = new PlatformImplementation(driver, appId, opts);
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

		// Enable sourcemaps on future loads by default for Streak employees.
		try {
			if (
				window.localStorage &&
				/@streak\.com$/.test(driver.getUserEmailAddress()) &&
				!window.localStorage.getItem('inboxsdk__enable_sourcemap')
			) {
				window.localStorage.setItem('inboxsdk__enable_sourcemap', 'true');
			}
		} catch(err) {
			console.error(err);
		}
		return pi;
	});
}
