'use strict';

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

let logger = require('./lib/logger');

let GmailDriver = require('./dom-driver/gmail/gmail-driver');

let PlatformImplementation = function(appId, opts){
	this._appId = appId;
	opts = _.extend({
		// defaults
		globalErrorLogging: true, eventTracking: true
	}, opts);
	this.LOADER_VERSION = opts.VERSION;
	this.IMPL_VERSION = process.env.VERSION;

	if (_.has(opts, 'REQUESTED_API_VERSION')) {
		opts.REQUESTED_API_VERSION = +opts.REQUESTED_API_VERSION;
		if (opts.REQUESTED_API_VERSION !== 1) {
			throw new Error("InboxSDK: Unsupported API version "+opts.REQUESTED_API_VERSION);
		}
	} else {
		// Deprecated `new InboxSDK` constructor used.
	}

	this._membraneMap = new MembraneMap();
	this._driver = new GmailDriver(appId, opts, this.LOADER_VERSION, this.IMPL_VERSION);

	this._driver.getLogger().eventSdkPassive('load');

	this.Compose = new Compose(appId, this._driver, this._membraneMap);
	this.Conversations = new Conversations(appId, this._driver, this._membraneMap);
	this.Keyboard = new Keyboard(appId, opts.appIconUrl, this._driver, this._membraneMap);
	this.User = new User(appId, this._driver, this._membraneMap);
	this.Lists = new Lists(appId, this._driver, this._membraneMap);
	this.NavMenu = new NavMenu(appId, this._driver, this._membraneMap);
	this.Router = new Router(appId, this._driver, this._membraneMap);
	this.Search = new Search(appId, this._driver, this._membraneMap);
	this.Toolbars = new Toolbars(appId, this._driver, this._membraneMap);
	this.ButterBar = new ButterBar(appId, this._driver, this._membraneMap);
	this.Modal = new Modal(appId, this._driver, this._membraneMap);

	this.Logger = this._driver.getLogger().getAppLogger();
};

module.exports = PlatformImplementation;
