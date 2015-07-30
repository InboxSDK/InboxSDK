'use strict';

var _ = require('lodash');
var asap = require('asap');

var EventEmitter = require('../lib/safe-event-emitter');

var memberMap = new WeakMap();


/**
 * @class
 * Object that represents an app toolbar button that has been already added to the top
 * navigation area of Gmail or Inbox. This class is returned by {Toolbars.addAppToolbarButton}.
 */
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

	/**
	*	Open the dropdown for the app toolbar button
	* @return {void}
	*/
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

	/**
	*	Close the dropdown for the app toolbar button
	* @return {void}
	*/
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

	/**
	*	Remove the app toolbar button from Gmail/Inbox
	* @return {void}
	*/
	remove: function(){
		_destroy(this);
	}

});

function _destroy(appToolbarButtonViewInstance){
	appToolbarButtonViewInstance.emit('destroy');

	appToolbarButtonViewInstance.removeAllListeners();
}

module.exports = AppToolbarButtonView;
