var AttachmentCardManager = require('./managers/attachment-card-manager');
var ComposeManager = require('./managers/compose-manager');
var MessageManager = require('./managers/message-manager');

var GmailDriver = require('./dom-driver/gmail/gmail-driver');


var PlatformImplementation = function(appId){
	this._appId = appId;

	this._driver = new GmailDriver();

	this.AttachmentCardManager = new AttachmentCardManager(appId, this._driver);
	this.ComposeManager = new ComposeManager(appId, this._driver);
	this.MessageManager = new MessageManager(appId, this._driver);
};


module.exports = PlatformImplementation;
