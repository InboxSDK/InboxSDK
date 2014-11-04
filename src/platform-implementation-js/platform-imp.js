var AttachmentCardManager = require('./managers/attachment-card-manager');
var ComposeManager = require('./managers/compose-manager');
var MessageManager = require('./managers/message-manager');
var Tracker = require('./tracker');
var Email = require('./email');

var GmailDriver = require('./dom-driver/gmail/gmail-driver');


var PlatformImplementation = function(appId){
	this._appId = appId;

	this._tracker = new Tracker(appId);
	this._driver = new GmailDriver();

	this.Email = new Email(appId, this._driver);
	this._tracker.setEmail(this.Email);

	this.AttachmentCardManager = new AttachmentCardManager(appId, this._driver);
	this.ComposeManager = new ComposeManager(appId, this._driver);
	this.MessageManager = new MessageManager(appId, this._driver);

	this.Utils = {
	    logErrorToServer: this._tracker.logErrorToServer.bind(this._tracker),
	    track: this._tracker.track.bind(this._tracker)
	};
};


module.exports = PlatformImplementation;
