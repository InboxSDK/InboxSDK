var _ = require('lodash');
var HandlerRegistry = require('../lib/handler-registry');
var ThreadRowView = require('../views/thread-row-view');

var Mailbox = function(appId, driver, platformImplementation){

	this._appId = appId;
	this._driver = driver;
	this._platformImplementation = platformImplementation;

	this._threadRowViewRegistry = new HandlerRegistry();

	var self = this;

	this._driver.getThreadRowViewDriverStream().onValue(function(viewDriver){
		var view = new ThreadRowView(viewDriver);
		self._threadRowViewRegistry.addTarget(view);
		view.on('destroy', function() {
			self._threadRowViewRegistry.removeTarget(view);
		});
	});

};

_.extend(Mailbox.prototype, {

	registerThreadRowViewHandler: function(handler) {
		return this._threadRowViewRegistry.registerHandler(handler);
	}

});

module.exports = Mailbox;
