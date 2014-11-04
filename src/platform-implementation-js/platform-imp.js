
var Views = require('./views');
var Tracker = require('./tracker');

var Email = require('./email');

var GmailDriver = require('./dom-driver/gmail/gmail-driver');


var PlatformImplementation = function(appId){
	this._appId = appId;

	this._tracker = new Tracker(appId);
	this._driver = new GmailDriver();

	this.Views = new Views(appId, this._driver);
	this.Email = new Email(appId, this._driver);
	this._tracker.setEmail(this.Email);

	this.Utils = {
	    logErrorToServer: this._tracker.logErrorToServer.bind(this._tracker),
	    track: this._tracker.track.bind(this._tracker)
	};
};


module.exports = PlatformImplementation;
