'use strict';

var _ = require('lodash');
var Bacon = require('baconjs');
var Map = require('es6-unweak-collections').Map;

var makeMutationObserverStream = require('../lib/dom/make-mutation-observer-stream');

var HandlerRegistry = require('../lib/handler-registry');

var Route = require('../views/route-view/route');
var RouteView = require('../views/route-view/route-view');

var memberMap = new Map();

var Router = function(appId, driver){
	var members = {};
	memberMap.set(this, members);

	members.appId = appId;
	members.driver = driver;

	members.currentRouteViewDriver = null;
	members.handlerRegistry = new HandlerRegistry();

	members.routes = [];
	members.customRoutes = [];

	members.lastNativeRouteName = null;
	members.modifiedNativeNavItem = null;

	_setupNativeRoutes(members);
	driver.getRouteViewDriverStream().onValue(_handleRouteViewChange, members);
};


_.extend(Router.prototype,  {

	createLink: function(name, paramArray){
		return memberMap.get(this).driver.createLink(name, paramArray);
	},

	goto: function(name, paramArray){
		memberMap.get(this).driver.gotoView(name, paramArray);
	},

	createNewRoute: function(routerDescription){
		var members = memberMap.get(this);
		members.customRoutes.push(routerDescription);

		members.routes.push(
			new Route({
				name: routerDescription.name,
				isCustomView: true,
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
				isCustomView: false,
				driver: members.driver
			})
		);

	});
}


function _handleRouteViewChange(members, routeViewDriver){
	_updateNavMenu(members, routeViewDriver);

	if(members.currentRouteViewDriver){
		members.currentRouteViewDriver.destroy();
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

	if(route.isCustomView()){
		members.driver.showCustomRouteView(routeViewDriver.getCustomViewElement());
		_informRelevantCustomRoutes(members.customRoutes, routeView);
	}
	else{
		members.driver.showNativeRouteView();
	}

	members.handlerRegistry.addTarget(routeView);
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

	if(oldRouteViewDriver && !oldRouteViewDriver.isCustomView()){
		if(newRouteViewDriver.isCustomView()){
			members.lastNativeRouteName = oldRouteViewDriver.getName();
			_removeNativeNavItemActive(members);
			return;
		}
	}
	else if(members.lastNativeRouteName && !newRouteViewDriver.isCustomView()){
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
		members.modifiedNativeNavItem.destroy(); //make sure there is only one active at a time;
	}

	members.modifiedNativeNavItem = members.driver.getCurrentActiveNavItem();

	if(!members.modifiedNativeNavItem){
		return;
	}


	members.modifiedNativeNavItem.setActive(false);

	var modifiedNavItem = members.modifiedNativeNavItem;
	makeMutationObserverStream(members.modifiedNativeNavItem.getElement().parentElement, {childList: true})
		.takeWhile(function(){
			return modifiedNavItem === members.modifiedNativeNavItem;
		})
		.flatMap(function(mutations){
			return Bacon.fromArray(mutations);
		})
		.flatMap(function(mutation){
			return Bacon.fromArray(_.toArray(mutation.removedNodes));
		})
		.filter(function(removedNode){
			return removedNode === modifiedNavItem.getElement();
		})
		.onValue(_removeNativeNavItemActive, members); //reset ourselves
}

function _restoreNativeNavItemActive(members){
	if(!members.modifiedNativeNavItem){
		return;
	}

	members.modifiedNativeNavItem.setActive(true);
	members.modifiedNativeNavItem.destroy();
	members.modifiedNativeNavItem = null;
}

function _unhandleNativeNavItem(members){
	if(members.modifiedNativeNavItem){
		members.modifiedNativeNavItem.destroy();
		members.modifiedNativeNavItem = null;
	}
}


module.exports = Router;
