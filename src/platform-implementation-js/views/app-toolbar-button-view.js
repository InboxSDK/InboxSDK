'use strict';

var _ = require('lodash');
var asap = require('asap');

var EventEmitter = require('../lib/safe-event-emitter');

var memberMap = new WeakMap();

var AppToolbarButtonView = function(appToolbarButtonViewDriverPromise){
	EventEmitter.call(this);

	var members = {};
	memberMap.set(this, members);

	members.appToolbarButtonViewDriverPromise = appToolbarButtonViewDriverPromise;

	var self = this;
	members.appToolbarButtonViewDriverPromise.then(function(appToolbarButtonViewDriver){
		members.appToolbarButtonViewDriver = appToolbarButtonViewDriver;
	});
};


AppToolbarButtonView.prototype = Object.create(EventEmitter.prototype);

_.extend(AppToolbarButtonView.prototype, {

	open: function(){
		if(!memberMap.has(this)){
			console.error('Tried to open after the button is destroyed');
			return;
		}

		var members = memberMap.get(this);
		members.appToolbarButtonViewDriverPromise.then(function(appToolbarButtonViewDriver){
			asap(function(){
				appToolbarButtonViewDriver.open();
			});
		});
	},

	close: function(){
		if(!memberMap.has(this)){
			console.error('Tried to close after the button is destroyed');
			return;
		}

		var members = memberMap.get(this);
		members.appToolbarButtonViewDriverPromise.then(function(appToolbarButtonViewDriver){
			asap(function(){
				appToolbarButtonViewDriver.close();
			});
		});
	},

	remove: function(){
		_destroy(this);
	}

});

function _destroy(appToolbarButtonViewInstance){
	appToolbarButtonViewInstance.emit('destroy');

	appToolbarButtonViewInstance.removeAllListeners();
}

module.exports = AppToolbarButtonView;
