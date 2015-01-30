'use strict';

var _ = require('lodash');

var MembraneMap = require('./lib/membrane-map');

var Compose = require('./platform-implementation/compose');
var Conversations = require('./platform-implementation/conversations');
var Keyboard = require('./platform-implementation/keyboard.js');
var Modal = require('./platform-implementation/modal');
var Mailbox = require('./platform-implementation/mailbox');
var NavMenu = require('./platform-implementation/nav-menu');
var Router = require('./platform-implementation/router');
var Search = require('./platform-implementation/search');
var Toolbars = require('./platform-implementation/toolbars');
var Tracker = require('./platform-implementation/tracker');
var User = require('./platform-implementation/user');

var GmailDriver = require('./dom-driver/gmail/gmail-driver');


var PlatformImplementation = function(appId, opts){
	this._appId = appId;
	opts = _.extend({
		// defaults
		globalErrorLogging: true
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

	this._tracker = new Tracker(appId, opts);
	this._membraneMap = new MembraneMap();

	this._driver = new GmailDriver();
	this._tracker.setDriver(this._driver);

	this.Compose = new Compose(appId, this._driver, this._membraneMap);
	this.Conversations = new Conversations(appId, this._driver, this._membraneMap);
	this.Keyboard = new Keyboard(appId, opts.appIconUrl, this._driver, this._membraneMap);
	this.User = new User(appId, this._driver, this._membraneMap);
	this.Mailbox = new Mailbox(appId, this._driver, this._membraneMap);
	this.NavMenu = new NavMenu(appId, this._driver, this._membraneMap);
	this.Router = new Router(appId, this._driver, this._membraneMap);
	this.Search = new Search(appId, this._driver, this._membraneMap);
	this.Toolbars = new Toolbars(appId, this._driver, this._membraneMap);
	this.Modal = new Modal(appId, this._driver, this._membraneMap);

	this.Utils = {
	    logErrorToServer: this._tracker.logErrorToServer.bind(this._tracker),
	    track: this._tracker.track.bind(this._tracker)
	};
};


module.exports = PlatformImplementation;
