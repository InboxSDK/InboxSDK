'use strict';

var _ = require('lodash');
var Bacon = require('baconjs');
var Map = require('es6-unweak-collections').Map;

var HandlerRegistry = require('../lib/handler-registry');

var RouteView = require('../views/route-view/route-view');
var ListRouteView = require('../views/route-view/list-route-view');
var CustomRouteView = require('../views/route-view/custom-route-view');

var memberMap = new Map();

/**
* @class
* This namespace contains functionality associated with creating your own content inside Gmail or Inbox. It allows you to define "Routes"
* which define a full page of content and an associated URL space for which they are active. You can think of routes as different pages
* in your application. Gmail and Inbox already have a few routes built in (Inbox, Sent, Drafts, etc). This namespace allows you to define
* your own as well as listen in on the built in routes being navigated to.
*
* This is typically used when you want to create content to fill the main content area of Gmail or Inbox.
*
* Every route has a URL associated with it and can have optional parameters. However, you never construct these URL's manually.
* The SDK will take care of creating a URL that will work in Gmail/Inbox for your Route. Since these URL's may change due to
* implementations of Gmail/Inbox, you should always create new links when trying to set URL on elements or simply use the goto
* function which naviagtes to the created link automatically.
*
* Using the <code>handleX</code> family of methods, you can specify which routes your application can handle. You will be called back with
* and instance of a RouteView or similar when the user navigates to a route you've declared you can handle. For custom routes, you'll typically
* add your own content and for built in routes, you'll typically modify the existing content.
*
* Route ID's are path like strings with named parameters, for example: "/myroute/:someParamMyRouteNeeds"
*/
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


_.extend(Router.prototype, /** @lends Router */ {

	/**
	* Get a URL that can be used to navigate to a view. You'll typically want to use this to set the href of an <a> element or similar.
	* @param {string} routeID - a route specifying where the link should navigate the user to
	* @param {Object} params an object containing the parameters that will be encoded in the link and decoded when the user
	* subsequently visits the route. Handlers for the specified routeID will receive a copy of this object. This object must contain
	* only simple key value pairs with no nested arrays/objects.
	* @return {string} the encoded URL
	*/
	createLink: function(routeID, params){
		return memberMap.get(this).driver.createLink(routeID, params);
	},

	/**
	* Change the route to be the one with the given ID and have the given parameters
	* @param {string} routeID - a route specifying where the link should navigate the user to
	* @param {Object} params an object containing the parameters that will be encoded in the link and decoded when the user
	* subsequently visits the route. Handlers for the specified routeID will receive a copy of this object. This object must contain
	* only simple key value pairs with no nested arrays/objects.
	*/
	goto: function(routeID, params){
		memberMap.get(this).driver.goto(routeID, params);
	},

	/**
	* Registers a handler (callback) to be called when the user navigates to a custom route which matches the routeID you provide.
	* Use this to create your own routes (pages) with your own custom content. Your callback will be passed an instance of a
	* <code>CustomRouteView</code> which you can modify the content.
	* @param {string} routeID - which route this handler is registering for
	* @param {function(CustomRouteView)} handler - the callback to call when the route changes to a custom route matching
	* the provided routeID
	*/
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
	},

	/**
	* Registers a handler (callback) to be called when the user navigates to any route (both customs and built in routes).
	* Because this can apply to any route, your callback will be given only a generic <code>RouteView</code>. This is typically used
	* when you want to monitor for page changes but don't necessarily need to modify the page.
	* @param {function(RouteView)} handler - the callback to call when the route changes
	*/
	handleAllRoutes: function(handler){
		return memberMap.get(this).allRoutesHandlerRegistry.registerHandler(handler);
	},

	/**
	* Registers a handler (callback) to be called when the user navigates to a list route which matches the routeID you provide.
	* Gmail and Inbox have several built in routes which are "Lists". These include routes like Inbox, All Mail, Sent, Drafts, etc.
	* You'll typically use this modify Gmail's and Inbox's built in List routes. Your callback will be passed an instance of a
	* <code>ListRouteView</code>
	* @param {string} routeID - which list route this handler is registering for. Permissible values are defined in <code>Router.NativeListRoutes</code>
	* @param {function(CustomRouteView)} handler - the callback to call when the route changes to a list route matching the routeId
	*/
	handleListRoute: function(routeID, handler){
		var listRouteHandlerRegistries = memberMap.get(this).listRouteHandlerRegistries;
		if(!listRouteHandlerRegistries[routeID]){
			listRouteHandlerRegistries[routeID] = new HandlerRegistry();
		}

		return listRouteHandlerRegistries[routeID].registerHandler(handler);
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

		if(members.listRouteHandlerRegistries[router.NativeRouteIDs.ANY_LIST]){
			members.listRouteHandlerRegistries[router.NativeRouteIDs.ANY_LIST].addTarget(listRouteView);
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
