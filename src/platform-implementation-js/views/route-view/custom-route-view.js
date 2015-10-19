'use strict';

var _ = require('lodash');
var RouteView = require('./route-view');

var membersMap = new WeakMap();

// documented in src/docs/
var CustomRouteView = function(routeViewDriver){
	RouteView.call(this, routeViewDriver);

	var members = {};
	membersMap.set(this, members);
	members.routeViewDriver = routeViewDriver;
};

CustomRouteView.prototype = Object.create(RouteView.prototype);

_.extend(CustomRouteView.prototype, {

	getElement(){
		return membersMap.get(this).routeViewDriver.getCustomViewElement();
	}

});


module.exports = CustomRouteView;
