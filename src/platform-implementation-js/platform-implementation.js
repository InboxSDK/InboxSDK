var Email = require('./email');
var FullscreenViews = require('./fullscreen-views');
var Mailbox = require('./mailbox');
var Toolbar = require('./toolbar');
var Views = require('./views');
var Tracker = require('./tracker');
var Widgets = require('./widgets');

var GmailDriver = require('./dom-driver/gmail/gmail-driver');


var PlatformImplementation = function(appId){
	this._appId = appId;

	this._tracker = new Tracker(appId);
	this._driver = new GmailDriver();

	this.Email = new Email(appId, this._driver);
	this.FullscreenViews = new FullscreenViews(appId, this._driver);
	this.Mailbox = new Mailbox(appId, this._driver, this);
	this.Toolbar = new Toolbar(appId, this._driver, this);
	this.Views = new Views(appId, this._driver);
	this.Widgets = new Widgets(appId, this._driver);

	this._tracker.setEmail(this.Email);

	this.Utils = {
	    logErrorToServer: this._tracker.logErrorToServer.bind(this._tracker),
	    track: this._tracker.track.bind(this._tracker)
	};
};


module.exports = PlatformImplementation;
