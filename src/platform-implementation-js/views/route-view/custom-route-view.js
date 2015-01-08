'use strict';

var _ = require('lodash');
var RouteView = require('./route-view');

var Map = require('es6-unweak-collections').Map;

var membersMap = new Map();

var CustomRouteView = function(routeViewDriver){
	RouteView.apply(this, routeViewDriver);

	var members = {};
	membersMap.set(this, members);

	members.routeViewDriver = routeViewDriver;
};

CustomRouteView.prototype = Object.create(RouteView.prototype);

_.extend(CustomRouteView.prototype, {


	/**
	* Gets the element representing the content area of this RouteView
	* @return {HTMLElement}
	*/
	getElement: function(){
		return membersMap.get(this).routeViewDriver.getCustomViewElement();
	}

});

module.exports = CustomRouteView;
