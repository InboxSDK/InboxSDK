'use strict';

var _ = require('lodash');
var asap = require('asap');

var EventEmitter = require('events').EventEmitter;

var memberMap = new WeakMap();

var ComposeButtonView = function(optionsPromise){
	EventEmitter.call(this);

	var members = {};
	memberMap.set(this, members);

	members.optionsPromise = optionsPromise;


	var self = this;
	members.optionsPromise.then(function(options){
		if(!options){
			_destroy(self);
			return;
		}

		members.buttonViewController = options.buttonViewController;
		members.buttonDescriptor = options.buttonDescriptor;
		members.composeViewDriver = options.composeViewDriver;

		members.composeViewDriver.getEventStream().onEnd(_destroy, self);
	});
};


ComposeButtonView.prototype = Object.create(EventEmitter.prototype);

_.extend(ComposeButtonView.prototype, {

	showTooltip: function(tooltipDescriptor){
		if(!memberMap.has(this)){
			console.error('Tried to add a tooltip after the button is destroyed');
			return;
		}

		var members = memberMap.get(this);
		members.optionsPromise.then(function(){
			asap(function(){
				members.composeViewDriver.addTooltipToButton(members.buttonViewController, members.buttonDescriptor, tooltipDescriptor);
			});
		});
	},

	closeTooltip: function(){
		if(!memberMap.has(this)){
			console.error('Tried to add a tooltip after the button is destroyed');
			return;
		}

		var members = memberMap.get(this);

		members.optionsPromise.then(function(){
			asap(function(){
				members.composeViewDriver.closeButtonTooltip(members.buttonViewController);
			});
		});
	}

});

function _destroy(composeButtonViewInstance){
	composeButtonViewInstance.emit('destroy');

	composeButtonViewInstance.removeAllListeners();
}

module.exports = ComposeButtonView;
