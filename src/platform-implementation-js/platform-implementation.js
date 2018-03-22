/* @flow */
/* eslint-disable no-console */

import SafeEventEmitter from './lib/safe-event-emitter';
import {BUILD_VERSION} from '../common/version';
import get from '../common/get-or-fail';
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
import InboxThreadRowView from './dom-driver/inbox/views/inbox-thread-row-view';

import DummyRouteViewDriver from './views/route-view/dummy-route-view-driver';
import RouteView from './views/route-view/route-view';
import GmailRouteView from './dom-driver/gmail/views/gmail-route-view/gmail-route-view';
import InboxRouteView from './dom-driver/inbox/views/inbox-route-view';
import InboxDummyRouteView from './dom-driver/inbox/views/inbox-dummy-route-view';
import InboxCustomRouteView from './dom-driver/inbox/views/inbox-custom-route-view';

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
import Global from './namespaces/global';

import GmailDriver from './dom-driver/gmail/gmail-driver';
import InboxDriver from './dom-driver/inbox/inbox-driver';
import Logger from './lib/logger';

import isValidAppId from './lib/is-valid-app-id';

// Some types
import type {Driver} from './driver-interfaces/driver';
import type {AppLogger} from './lib/logger';

const loadedAppIds: Set<string> = new Set();
const memberMap = new WeakMap();

export type PiOpts = {
	appName: ?string;
	appIconUrl: ?string;
	suppressAddonTitle?: ?string;
	VERSION: string;
	globalErrorLogging: boolean;
	eventTracking: boolean;
	inboxBeta: boolean;
	REQUESTED_API_VERSION: number;
	primaryColor?: string;
	secondaryColor?: string;
};

export class PlatformImplementation extends SafeEventEmitter {
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
	Global: ?Global;
	Modal: ?Modal;
	Logger: AppLogger;

	constructor(driver: Driver, appId: string, piOpts: PiOpts) {
		super();
		const {appName, appIconUrl, VERSION:LOADER_VERSION} = piOpts;

		const members = {driver};
		memberMap.set(this, members);

		if (process.env.NODE_ENV !== 'production') {
			(this:any)._members = members;
		}

		const membrane = new Membrane([
			[GmailAttachmentCardView, viewDriver => new AttachmentCardView(viewDriver, driver, membrane)],
			[InboxAttachmentCardView, viewDriver => new AttachmentCardView(viewDriver, driver, membrane)],
			[GmailMessageView, viewDriver => new MessageView(viewDriver, appId, membrane, this.Conversations, driver)],
			[InboxMessageView, viewDriver => new MessageView(viewDriver, appId, membrane, this.Conversations, driver)],
			[GmailThreadView, viewDriver => new ThreadView(viewDriver, appId, driver, membrane)],
			[InboxThreadView, viewDriver => new ThreadView(viewDriver, appId, driver, membrane)],
			[GmailThreadRowView, viewDriver => new ThreadRowView(viewDriver)],
			[InboxThreadRowView, viewDriver => new ThreadRowView(viewDriver)],
			[GmailRouteView, viewDriver => new RouteView(viewDriver)],
			[InboxRouteView, viewDriver => new RouteView(viewDriver)],
			[InboxDummyRouteView, viewDriver => new RouteView(viewDriver)],
			[InboxCustomRouteView, viewDriver => new RouteView(viewDriver)],
			[DummyRouteViewDriver, viewDriver => new RouteView(viewDriver)]
		]);
		this.destroyed = false;
		this.LOADER_VERSION = LOADER_VERSION;
		this.IMPL_VERSION = BUILD_VERSION;

		this.ButterBar = new ButterBar(appId, driver);
		driver.setButterBar(this.ButterBar);

		this.Compose = new Compose(appId, driver, piOpts);
		this.Conversations = new Conversations(appId, driver, membrane);
		this.Keyboard = new Keyboard(appId, appName, appIconUrl, driver);
		this.User = new User(driver, piOpts);
		this.Lists = new Lists(appId, driver, membrane);
		this.NavMenu = new NavMenu(appId, driver);
		this.Router = new Router(appId, driver, membrane);
		this.Search = new Search(appId, driver);
		this.Toolbars = new Toolbars(appId, driver, membrane, piOpts);
		this.Widgets = new Widgets(appId, driver);

		if (piOpts.REQUESTED_API_VERSION === 1) {
			// Modal is deprecated; just drop it when apps switch to the next version
			// whenever we start that.
			this.Modal = new Modal(appId, driver, piOpts);
		}

		if (piOpts.REQUESTED_API_VERSION >= 2) {
			// new Global namespace only available in v2 or above
			this.Global = new Global(appId, driver, piOpts);
		}
		this.Logger = driver.getLogger().getAppLogger();
	}

	destroy() {
		if (!this.destroyed) {
			this.destroyed = true;
			get(memberMap, this).driver.destroy();
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

	const opts: PiOpts = {
		// defaults
		globalErrorLogging: true, eventTracking: true,
		inboxBeta: false,
		..._opts
	};

	opts.REQUESTED_API_VERSION = +opts.REQUESTED_API_VERSION;
	switch (opts.REQUESTED_API_VERSION) {
		case 2:
			opts.inboxBeta = true;
			break;
		case 1:
			break;
		default:
			throw new Error("InboxSDK: Unsupported API version "+opts.REQUESTED_API_VERSION);
	}

	const DRIVERS_BY_ORIGIN: {[name:string]: *} = {
		'https://mail.google.com': GmailDriver,
		'https://inbox.google.com': InboxDriver
	};

	const LOADER_VERSION: string = opts.VERSION;
	const IMPL_VERSION: string = BUILD_VERSION;
	const logger = new Logger(appId, opts, LOADER_VERSION, IMPL_VERSION);

	const origin: string = (document.location: any).origin;
	const DriverClass = DRIVERS_BY_ORIGIN[origin];
	if (!DriverClass) {
		console.log("InboxSDK: Unsupported origin", origin);
		// never resolve
		return new Promise((resolve, reject) => {});
	}

	sharedStyle();

	const driver: Driver = new DriverClass(appId, LOADER_VERSION, IMPL_VERSION, logger, opts, envData);
	return driver.onready.then(() => {
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
		const pi = new PlatformImplementation(driver, appId, opts);
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
