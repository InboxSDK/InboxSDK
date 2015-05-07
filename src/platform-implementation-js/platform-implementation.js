let _ = require('lodash');

let MembraneMap = require('./lib/membrane-map');

let ButterBar = require('./platform-implementation/butter-bar');
let Compose = require('./platform-implementation/compose');
let Conversations = require('./platform-implementation/conversations');
let Keyboard = require('./platform-implementation/keyboard.js');
let Modal = require('./platform-implementation/modal');
let Lists = require('./platform-implementation/lists');
let NavMenu = require('./platform-implementation/nav-menu');
let Router = require('./platform-implementation/router');
let Search = require('./platform-implementation/search');
let Toolbars = require('./platform-implementation/toolbars');
let User = require('./platform-implementation/user');

import GmailDriver from './dom-driver/gmail/gmail-driver';
import InboxDriver from './dom-driver/inbox/inbox-driver';

import isValidAppId from './lib/is-valid-app-id';

// returns a promise for the PlatformImplementation object
export default function makePlatformImplementation(appId, opts) {
	if (typeof appId !== 'string') {
		throw new Error("appId must be a string");
	}

	const pi = {
		_appId: appId,
		LOADER_VERSION: opts.VERSION,
		IMPL_VERSION: process.env.VERSION
	};

	opts = _.extend({
		// defaults
		globalErrorLogging: true, eventTracking: true,
		inboxBeta: false
	}, opts);

	opts.REQUESTED_API_VERSION = +opts.REQUESTED_API_VERSION;
	if (opts.REQUESTED_API_VERSION !== 1) {
		throw new Error("InboxSDK: Unsupported API version "+opts.REQUESTED_API_VERSION);
	}

	const DRIVERS_BY_ORIGIN = {
		'https://mail.google.com': GmailDriver,
		'https://inbox.google.com': opts.inboxBeta && InboxDriver
	};

	pi._membraneMap = new MembraneMap();

	const DriverClass = DRIVERS_BY_ORIGIN[document.location.origin];
	if (!DriverClass) {
		console.log("InboxSDK: Unsupported origin", document.location.origin);
		return new Promise(function(resolve, reject) {
			// never resolve
		});
	}

	pi._driver = new DriverClass(appId, opts, pi.LOADER_VERSION, pi.IMPL_VERSION);
	return pi._driver.onready.then(() => {
		pi._driver.getLogger().eventSdkPassive('load');

		if (!isValidAppId(appId)) {
			console.error(`
===========================================================
InboxSDK: You have loaded InboxSDK with an invalid appId:
${appId}
Registering an appId is free. Please see
https://www.inboxsdk.com/docs/#RequiredSetup
===========================================================
`);
			pi._driver.showAppIdWarning();
		}

		pi.Compose = new Compose(appId, pi._driver, pi._membraneMap);
		pi.Conversations = new Conversations(appId, pi._driver, pi._membraneMap);
		pi.Keyboard = new Keyboard(appId, opts.appIconUrl, pi._driver, pi._membraneMap);
		pi.User = new User(appId, pi._driver, pi._membraneMap);
		pi.Lists = new Lists(appId, pi._driver, pi._membraneMap);
		pi.NavMenu = new NavMenu(appId, pi._driver, pi._membraneMap);
		pi.Router = new Router(appId, pi._driver, pi._membraneMap);
		pi.Search = new Search(appId, pi._driver, pi._membraneMap);
		pi.Toolbars = new Toolbars(appId, pi._driver, pi._membraneMap);
		pi.ButterBar = new ButterBar(appId, pi._driver, pi._membraneMap);
		pi.Modal = new Modal(appId, pi._driver, pi._membraneMap);

		pi.Logger = pi._driver.getLogger().getAppLogger();

		return pi;
	});
}
