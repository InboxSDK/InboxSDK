var Views = require('./views');
var Email = require('./email');

var GmailDriver = require('./dom-driver/gmail/gmail-driver');


var PlatformImplementation = function(appId){
	this._appId = appId;

	this._driver = new GmailDriver();

	this.Views = new Views(appId, this._driver);
	this.Email = new Email(appId, this._driver);

	this.Utils = {
	    logErrorToServer: require('./log-error-to-server'),
	    track: require('./track')
	};
};


module.exports = PlatformImplementation;
