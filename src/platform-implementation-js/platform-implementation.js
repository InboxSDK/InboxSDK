var _ = require('lodash');
var Compose = require('./platform-implementation/compose');
var Conversations = require('./platform-implementation/conversations');
var Email = require('./platform-implementation/email');
var Modal = require('./platform-implementation/modal');
var Router = require('./platform-implementation/router');
var Mailbox = require('./platform-implementation/mailbox');
var NavMenu = require('./platform-implementation/nav-menu');
var Toolbars = require('./platform-implementation/toolbars');

var Tracker = require('./platform-implementation/tracker');

var GmailDriver = require('./dom-driver/gmail/gmail-driver');


var PlatformImplementation = function(appId, opts){
	this._appId = appId;
	opts = _.extend({
		// defaults
		globalErrorLogging: true
	}, opts);
	this.VERSION = process.env.VERSION;

	this._tracker = new Tracker(appId, opts);

	this._driver = new GmailDriver();

	this.Compose = new Compose(appId, this._driver);
	this.Conversations = new Conversations(appId, this._driver);

	this.Email = new Email(appId, this._driver);
	this.Router = new Router(appId, this._driver);
	this.FullscreenViews = this.Router; /* deprecated */
	this.Mailbox = new Mailbox(appId, this._driver, this);
	this.NavMenu = new NavMenu(appId, this._driver);
	this.Toolbars = new Toolbars(appId, this._driver, this);
	this.Modal = new Modal(appId, this._driver);

	this._tracker.setEmail(this.Email);

	this.Utils = {
	    logErrorToServer: this._tracker.logErrorToServer.bind(this._tracker),
	    track: this._tracker.track.bind(this._tracker)
	};
};


module.exports = PlatformImplementation;
