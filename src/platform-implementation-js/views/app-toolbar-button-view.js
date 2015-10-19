'use strict';

var _ = require('lodash');

var EventEmitter = require('../lib/safe-event-emitter');

var memberMap = new WeakMap();

// Documented in src/docs/app-toolbar-button-view.js
var AppToolbarButtonView = function(driver, appToolbarButtonViewDriverPromise){
	EventEmitter.call(this);

	var members = {};
	memberMap.set(this, members);

	members.appToolbarButtonViewDriverPromise = appToolbarButtonViewDriverPromise;

	var self = this;
	members.appToolbarButtonViewDriverPromise.then(function(appToolbarButtonViewDriver){
		members.appToolbarButtonViewDriver = appToolbarButtonViewDriver;
		appToolbarButtonViewDriver.getStopper().onValue(function() {
			self.emit('destroy');
		});
	});

	driver.getStopper().onValue(() => {
		this.remove();
	});
};


AppToolbarButtonView.prototype = Object.create(EventEmitter.prototype);

_.extend(AppToolbarButtonView.prototype, {

	open: function(){
		var members = memberMap.get(this);
		members.appToolbarButtonViewDriverPromise.then(function(appToolbarButtonViewDriver){
			appToolbarButtonViewDriver.open();
		});
	},

	close: function(){
		var members = memberMap.get(this);
		members.appToolbarButtonViewDriverPromise.then(function(appToolbarButtonViewDriver){
			appToolbarButtonViewDriver.close();
		});
	},

	remove: function(){
		var members = memberMap.get(this);
		members.appToolbarButtonViewDriverPromise.then(function(appToolbarButtonViewDriver){
			appToolbarButtonViewDriver.destroy();
		});
	}
});

module.exports = AppToolbarButtonView;
