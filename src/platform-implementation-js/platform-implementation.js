'use strict';

var _ = require('lodash');

var MembraneMap = require('./lib/membrane-map');

var ButterBar = require('./platform-implementation/butter-bar');
var Compose = require('./platform-implementation/compose');
var Conversations = require('./platform-implementation/conversations');
var Keyboard = require('./platform-implementation/keyboard.js');
var Modal = require('./platform-implementation/modal');
var Lists = require('./platform-implementation/lists');
var NavMenu = require('./platform-implementation/nav-menu');
var Router = require('./platform-implementation/router');
var Search = require('./platform-implementation/search');
var Toolbars = require('./platform-implementation/toolbars');
var User = require('./platform-implementation/user');

var logger = require('./lib/logger');

var GmailDriver = require('./dom-driver/gmail/gmail-driver');

var PlatformImplementation = function(appId, opts){
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
	this.ButterBar = new ButterBar(appId, this._driver);
	this.Modal = new Modal(appId, this._driver, this._membraneMap);

	this.Logger = this._driver.getLogger().getAppLogger();
};

module.exports = PlatformImplementation;
