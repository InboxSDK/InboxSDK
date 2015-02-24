'use strict';

var _ = require('lodash');
var RouteView = require('./route-view');

var membersMap = new WeakMap();

/**
* @class
* CustomRouteViews represent your own custom pages of content.
* @extends RouteView
*/
var CustomRouteView = function(routeViewDriver){
	RouteView.call(this, routeViewDriver);

	var members = {};
	membersMap.set(this, members);
	members.routeViewDriver = routeViewDriver;
};

CustomRouteView.prototype = Object.create(RouteView.prototype);

_.extend(CustomRouteView.prototype, /** @lends CustomRouteView */{


	/**
	* Gets the element representing the content area of this CustomRouteView
	* @return {HTMLElement} the main element of your custom route
	*/
	getElement: function(){
		return membersMap.get(this).routeViewDriver.getCustomViewElement();
	}

});


module.exports = CustomRouteView;
