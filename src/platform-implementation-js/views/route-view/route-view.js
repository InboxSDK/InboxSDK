'use strict';

var _ = require('lodash');
var EventEmitter = require('../../lib/safe-event-emitter');
var RSVP = require('rsvp');


var membersMap = new WeakMap();

// documented in src/docs/
var RouteView = function(routeViewDriver){
	EventEmitter.call(this);

	var members = {
		routeID: null,
		routeType: null,
		params: null
	};
	membersMap.set(this, members);

	members.routeViewDriver = routeViewDriver;

	_bindToEventStream(routeViewDriver, this);
};

RouteView.prototype = Object.create(EventEmitter.prototype);

_.extend(RouteView.prototype, {

	getRouteID(){
		var members = membersMap.get(this);

		if(!members.routeID){
			members.routeID = members.routeViewDriver.getRouteID();
		}

		return members.routeID;
	},

	getRouteType(){
		var members = membersMap.get(this);

		if(!members.routeType){
			members.routeType = members.routeViewDriver.getRouteType();
		}

		return members.routeType;
	},

	getParams(){
		var members = membersMap.get(this);

		if(!members.params){
			members.params = members.routeViewDriver.getParams();
		}

		return members.params;
	}

});


function _bindToEventStream(routeViewDriver, routeView){
	routeViewDriver.getEventStream().onEnd(function(){
		routeView.emit('destroy');
		routeView.removeAllListeners();
	});
}

module.exports = RouteView;
