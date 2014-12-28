'use strict';

var _ = require('lodash');
var Bacon = require('baconjs');
var Map = require('es6-unweak-collections').Map;

var HandlerRegistry = require('../lib/handler-registry');

var Route = require('../views/route-view/route');
var RouteView = require('../views/route-view/route-view');

var SearchResultsView = require('../views/search-results-view');

var memberMap = new Map();

var Router = function(appId, driver){
	var members = {};
	memberMap.set(this, members);

	members.appId = appId;
	members.driver = driver;

	members.currentRouteViewDriver = null;
	members.currentRouteView = null;
	members.handlerRegistry = new HandlerRegistry();

	members.routes = [];
	members.customRoutes = [];

	members.lastNativeRouteName = null;
	members.modifiedNativeNavItem = null;

	_setupNativeRoutes(members);
	driver.getRouteViewDriverStream().onValue(_handleRouteViewChange, this, members);
};


_.extend(Router.prototype,  {

	createLink: function(name, paramArray){
		return memberMap.get(this).driver.createLink(name, paramArray);
	},

	goto: function(name, paramArray){
		memberMap.get(this).driver.goto(name, paramArray);
	},

	createNewRoute: function(routerDescription){
		var members = memberMap.get(this);
		members.customRoutes.push(routerDescription);

		members.routes.push(
			new Route({
				name: routerDescription.name,
				isCustomRoute: true,
				driver: members.driver
			})
		);
	},

	registerRouteViewHandler: function(handler){
		return memberMap.get(this).handlerRegistry.registerHandler(handler);
	}

});

function _setupNativeRoutes(members){
	var nativeViewNames = members.driver.getNativeRouteNames();

	nativeViewNames.forEach(function(viewName){
		members.routes.push(
			new Route({
				name: viewName,
				isCustomRoute: false,
				driver: members.driver
			})
		);

	});
}



function _handleRouteViewChange(router, members, routeViewDriver){
	_updateNavMenu(members, routeViewDriver);

	if(members.currentRouteViewDriver){
		members.currentRouteViewDriver.destroy();
	}

	if(members.currentRouteView){
		members.currentRouteView.destroy();
	}

	var route = _.find(members.routes, function(route){
		return route.getName() === routeViewDriver.getName();
	});

	if(!route){
		routeViewDriver.destroy();
		return;
	}

	members.currentRouteViewDriver = routeViewDriver;

	var routeView = new RouteView(routeViewDriver, route);

	if(route.isCustomRoute()){
		members.driver.showCustomRouteView(routeViewDriver.getCustomViewElement());
		_informRelevantCustomRoutes(members.customRoutes, routeView);
	}
	else{
		members.driver.showNativeRouteView();
	}

	members.handlerRegistry.addTarget(routeView);
	members.currentRouteView = routeView;
}


function _informRelevantCustomRoutes(customRoutes, routeView){
	customRoutes
		.filter(function(customRoute){
			return customRoute.name === routeView.getName();
		})
		.forEach(function(customRoute){
			customRoute.onActivate({
				routeView: routeView,
				fullscreenView: routeView, /* deprecated */
				el: routeView.getElement()
			});
		});
}


function _updateNavMenu(members, newRouteViewDriver){
	var oldRouteViewDriver = members.currentRouteViewDriver;

	if(oldRouteViewDriver && !oldRouteViewDriver.isCustomRoute()){
		if(newRouteViewDriver.isCustomRoute()){
			members.lastNativeRouteName = oldRouteViewDriver.getName();
			_removeNativeNavItemActive(members);
			return;
		}
	}
	else if(members.lastNativeRouteName && !newRouteViewDriver.isCustomRoute()){
		if(members.lastNativeRouteName === newRouteViewDriver.getName()){
			_restoreNativeNavItemActive(members);
		}
		else{
			_unhandleNativeNavItem(members);
		}
	}
}


function _removeNativeNavItemActive(members){
	if(members.modifiedNativeNavItem){
		members.modifiedNativeNavItem.setActive(false); //make sure there is only one active at a time;
	}

	members.modifiedNativeNavItem = members.driver.getCurrentActiveNavItem();

	if(!members.modifiedNativeNavItem){
		return;
	}

	members.modifiedNativeNavItem.setActive(false);
	members.modifiedNativeNavItem
		.getEventStream()
		.filter(function(event){
			return event.eventName === 'invalidated';
		})
		.onValue(_removeNativeNavItemActive, members);
}

function _restoreNativeNavItemActive(members){
	if(!members.modifiedNativeNavItem){
		return;
	}

	members.modifiedNativeNavItem.setActive(true);
	members.modifiedNativeNavItem = null;
}

function _unhandleNativeNavItem(members){
	members.modifiedNativeNavItem = null;
}


module.exports = Router;
