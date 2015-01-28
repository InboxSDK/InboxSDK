'use strict';

var _ = require('lodash');

var MembraneMap = require('./lib/membrane-map');

var Compose = require('./platform-implementation/compose');
var Conversations = require('./platform-implementation/conversations');
var User = require('./platform-implementation/user');
var Modal = require('./platform-implementation/modal');
var Router = require('./platform-implementation/router');
var Search = require('./platform-implementation/search');
var Mailbox = require('./platform-implementation/mailbox');
var NavMenu = require('./platform-implementation/nav-menu');
var Toolbars = require('./platform-implementation/toolbars');

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

	logger.setup(appId, opts, this.LOADER_VERSION, this.IMPL_VERSION);
	this._membraneMap = new MembraneMap();
	this._driver = new GmailDriver();
	logger.setUserEmailAddress(this._driver.getUserEmailAddress());

	logger.eventSdkPassive('load', {appId: appId});

	this.Compose = new Compose(appId, this._driver, this._membraneMap);
	this.Conversations = new Conversations(appId, this._driver, this._membraneMap);
	this.User = new User(appId, this._driver, this._membraneMap);
	this.Mailbox = new Mailbox(appId, this._driver, this._membraneMap);
	this.NavMenu = new NavMenu(appId, this._driver, this._membraneMap);
	this.Router = new Router(appId, this._driver, this._membraneMap);
	this.Search = new Search(appId, this._driver, this._membraneMap);
	this.Toolbars = new Toolbars(appId, this._driver, this._membraneMap);
	this.Modal = new Modal(appId, this._driver, this._membraneMap);

	this.Logger = {
		error: logger.errorApp.bind(logger, appId),
		event: logger.eventApp.bind(logger, appId)
	};
};

module.exports = PlatformImplementation;
