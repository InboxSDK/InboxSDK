'use strict';

var _ = require('lodash');

var EventEmitter = require('../lib/safe-event-emitter');

var memberMap = new WeakMap();


/**
 * @class
 * Object that represents an app toolbar button that has been already added to the top
 * navigation area of Gmail or Inbox. This class is returned by {Toolbars.setAppToolbarButton()}.
 */
var AppToolbarButtonView = function(appToolbarButtonViewDriverPromise){
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
};


AppToolbarButtonView.prototype = Object.create(EventEmitter.prototype);

_.extend(AppToolbarButtonView.prototype, /** @lends AppToolbarButtonView */ {

	/**
	*	Open the dropdown for the app toolbar button
	* @return {void}
	*/
	open: function(){
		var members = memberMap.get(this);
		members.appToolbarButtonViewDriverPromise.then(function(appToolbarButtonViewDriver){
			appToolbarButtonViewDriver.open();
		});
	},

	/**
	*	Close the dropdown for the app toolbar button
	* @return {void}
	*/
	close: function(){
		var members = memberMap.get(this);
		members.appToolbarButtonViewDriverPromise.then(function(appToolbarButtonViewDriver){
			appToolbarButtonViewDriver.close();
		});
	},

	/**
	*	Remove the app toolbar button from Gmail/Inbox
	* @return {void}
	*/
	remove: function(){
		var members = memberMap.get(this);
		members.appToolbarButtonViewDriverPromise.then(function(appToolbarButtonViewDriver){
			appToolbarButtonViewDriver.destroy();
		});
	}
});

module.exports = AppToolbarButtonView;
