'use strict';

var _ = require('lodash');
var Bacon = require('baconjs');
var Map = require('es6-unweak-collections').Map;

var HandlerRegistry = require('../lib/handler-registry');

var RouteView = require('../views/route-view/route-view');
var ListRouteView = require('../views/route-view/list-route-view');
var CustomRouteView = require('../views/route-view/custom-route-view');

var memberMap = new Map();

var Router = function(appId, driver){
	var members = {};
	memberMap.set(this, members);

	members.appId = appId;
	members.driver = driver;

	members.currentRouteViewDriver = null;

	members.allRoutesHandlerRegistry = new HandlerRegistry();
	members.listRouteHandlerRegistries = {};

	members.customRoutes = [];

	members.lastNativeRouteID = null;
	members.modifiedNativeNavItem = null;

	driver.getRouteViewDriverStream().onValue(_handleRouteViewChange, this, members);

	this.NativeRouteIDs = driver.getNativeRouteIDs();
	this.NativeRouteTypes = driver.getNativeRouteTypes();
};


_.extend(Router.prototype,  {

	createLink: function(routeID, params){
		return memberMap.get(this).driver.createLink(routeID, params);
	},

	goto: function(routeID, params){
		memberMap.get(this).driver.goto(routeID, params);
	},

	handleAllRoutes: function(handler){
		return memberMap.get(this).allRoutesHandlerRegistry.registerHandler(handler);
	},

	handleListRoute: function(routeID, handler){
		var listRouteHandlerRegistries = memberMap.get(this).listRouteHandlerRegistries;
		if(!listRouteHandlerRegistries[routeID]){
			listRouteHandlerRegistries[routeID] = new HandlerRegistry();
		}

		return listRouteHandlerRegistries[routeID].registerHandler(handler);
	},

	handleCustomRoute: function(routeID, handler){
		var customRouteDescriptor = {
			routeID: routeID,
			onActivate: handler
		};

		var customRoutes = memberMap.get(this).customRoutes;
		customRoutes.push(customRouteDescriptor);

		return function(){
			var index = customRoutes.indexOf(customRouteDescriptor);
			if(index > -1){
				customRoutes.splice(index, 1);
			}
		};
	}

});


function _handleRouteViewChange(router, members, routeViewDriver){
	_updateNavMenu(members, routeViewDriver);

	if(members.currentRouteViewDriver){
		members.currentRouteViewDriver.destroy();
	}

	members.currentRouteViewDriver = routeViewDriver;
	var routeView = new RouteView(routeViewDriver, members.driver);

	if(routeView.isCustomRoute()){
		_informRelevantCustomRoutes(members, routeViewDriver);
	}
	else{
		members.driver.showNativeRouteView();
	}

	members.pendingSearchResultsView = null;
	members.allRoutesHandlerRegistry.addTarget(routeView);

	if(!routeView.isCustomRoute() && routeView.getRouteType() === router.NativeRouteTypes.List){
		var listRouteView = new ListRouteView(routeViewDriver, members.driver);

		if(members.listRouteHandlerRegistries[routeView.getRouteID()]){
			members.listRouteHandlerRegistries[routeView.getRouteID()].addTarget(listRouteView);
		}
	}
}


function _informRelevantCustomRoutes(members, routeViewDriver){
	var customRouteView = new CustomRouteView(routeViewDriver);

	members.customRoutes
		.filter(function(customRoute){
			if(!customRoute.routeID){
				return false;
			}

			if(_.isArray(customRoute.routeID)){
				return _.any(customRoute.routeID, function(routeID){
					return routeViewDriver.doesMatchRouteID(routeID);
				});
			}

			return routeViewDriver.doesMatchRouteID(customRoute.routeID);
		})
		.forEach(function(customRoute){
			if(_.isArray(customRoute.routeID)){
				customRouteView.setRouteID(
					_.find(customRoute.routeID, function(routeID){
						return routeViewDriver.doesMatchRouteID(routeID);
					})
				);
			}
			else{
				customRouteView.setRouteID(customRoute.routeID);
			}
			try{
				members.driver.showCustomRouteView(routeViewDriver.getCustomViewElement());
				customRoute.onActivate(customRouteView);
			}
			catch(err){
				setTimeout(function() {
					throw err;
				}, 0);
			}

		});
}


function _updateNavMenu(members, newRouteViewDriver){
	var oldRouteViewDriver = members.currentRouteViewDriver;

	if(oldRouteViewDriver && !oldRouteViewDriver.isCustomRoute()){
		if(newRouteViewDriver.isCustomRoute()){
			members.lastNativeRouteID = oldRouteViewDriver.getRouteID();
			_removeNativeNavItemActive(members);
			return;
		}
	}
	else if(members.lastNativeRouteID && !newRouteViewDriver.isCustomRoute()){
		if(members.lastNativeRouteID === newRouteViewDriver.getRouteID()){
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
