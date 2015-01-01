'use strict';

var _ = require('lodash');
var Bacon = require('baconjs');
var Map = require('es6-unweak-collections').Map;

var HandlerRegistry = require('../lib/handler-registry');

var RouteView = require('../views/route-view');

var memberMap = new Map();

var Router = function(appId, driver){
	var members = {};
	memberMap.set(this, members);

	members.appId = appId;
	members.driver = driver;

	members.currentRouteViewDriver = null;
	members.currentRouteView = null;

	members.handlerRegistry = new HandlerRegistry();

	members.customRoutes = [];

	members.lastNativeRouteID = null;
	members.modifiedNativeNavItem = null;

	driver.getRouteViewDriverStream().delay(1).onValue(_handleRouteViewChange, this, members);

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

	createNewRoute: function(routerDescription){
		var members = memberMap.get(this);
		members.customRoutes.push(routerDescription);
	},

	registerRouteViewHandler: function(handler){
		return memberMap.get(this).handlerRegistry.registerHandler(handler);
	}

});


function _handleRouteViewChange(router, members, routeViewDriver){
	_updateNavMenu(members, routeViewDriver);

	if(members.currentRouteView){
		members.currentRouteView.destroy();
	}

	members.currentRouteViewDriver = routeViewDriver;
	var routeView = new RouteView(routeViewDriver, members.driver);

	if(routeView.isCustomRoute()){
		_informRelevantCustomRoutes(members, routeView, routeViewDriver);
	}
	else{
		members.driver.showNativeRouteView();
	}

	members.pendingSearchResultsView = null;
	members.handlerRegistry.addTarget(routeView);
	members.currentRouteView = routeView;
}


function _informRelevantCustomRoutes(members, routeView, routeViewDriver){
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
				routeView.setRouteID(
					_.find(customRoute.routeID, function(routeID){
						return routeViewDriver.doesMatchRouteID(routeID);
					})
				);
			}
			else{
				routeView.setRouteID(customRoute.routeID);
			}
			try{
				members.driver.showCustomRouteView(routeViewDriver.getCustomViewElement());

				customRoute.onActivate({
					routeView: routeView,
					el: routeView.getElement()
				});
			}
			catch(err){
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
