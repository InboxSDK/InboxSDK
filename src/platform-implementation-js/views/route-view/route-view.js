'use strict';

var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;
var RSVP = require('rsvp');
var Map = require('es6-unweak-collections').Map;


var membersMap = new Map();

/**
 * @class
 * RouteViews represent pages within Gmail or Inbox that a user can navigate to. RouteViews can be "custom", those
 * that the application developer registers, or they can be "builtin" which are those that the email client natively
 * supports like "Sent", "Drafts", or "Inbox"
 *
 * This class mostly just gives you metadata about the route, most of the functionality to modify the route are
 * defined in subclasses like <code>ListRouteView</code> and <code>CustomRouteView</code>, which you get by
 * handling those types specifically in the Router.
 */
var RouteView = function(routeViewDriver){
	EventEmitter.call(this);

	var members = {};
	membersMap.set(this, members);

	members.routeViewDriver = routeViewDriver;

	_bindToEventStream(routeViewDriver, this);
};

RouteView.prototype = Object.create(EventEmitter.prototype);

_.extend(RouteView.prototype, /** @lends RouteView */{

	/**
	 * Get the ID of the RouteView. This is the same routeID that you give <code>Router.goto</code> or <code>Router.createLink</code>.
	 * @return {string}
	 */
	getRouteID: function(){
		var members = membersMap.get(this);

		if(!members.routeID){
			members.routeID = members.routeViewDriver.getRouteID();
		}

		return members.routeID;
	},

	/**
	* Get the type of the route, either custom or native
	* @return {string}
	*/
	getRouteType: function(){
		var members = membersMap.get(this);

		if(!members.routeType){
			members.routeType = members.routeViewDriver.getRouteType();
		}

		return members.routeType;
	},

	/**
	 * Get the URL parameters of this RouteView instance
	 * @return {string[]}
	 */
	getParams: function(){
		var members = membersMap.get(this);

		if(!members.params){
			members.params = members.routeViewDriver.getParams(members.routeID);
		}

		return members.params;
	},

	/* TODO NOT PUBLIC, get it outta here */
	setRouteID: function(routeID){
		membersMap.get(this).routeID = routeID;
	},


	/**
	* Fires when this RouteView instance is navigated away from
	* @event RouteView#destroy
	*/

});


function _bindToEventStream(routeViewDriver, routeView){
	routeViewDriver.getEventStream().onEnd(function(){
		routeView.emit('destroy');
		membersMap.delete(routeView);
		routeView.removeAllListeners();
	});
}

module.exports = RouteView;
