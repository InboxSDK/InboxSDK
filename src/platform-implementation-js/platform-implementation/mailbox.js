var _ = require('lodash');

var Mailbox = function(appId, driver, platformImplementation){

	this._appId = appId;
	this._driver = driver;
	this._platformImplementation = platformImplementation;

};

_.extend(Mailbox.prototype, {


});

module.exports = Mailbox;
