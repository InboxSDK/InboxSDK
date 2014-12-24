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
	members.searchViewHandlerRegistry = new HandlerRegistry();

	members.routes = [];
	members.customRoutes = [];

	members.lastNativeRouteName = null;
	members.modifiedNativeNavItem = null;

	members.pendingSearchResultsView = null;

	_setupNativeRoutes(members);
	driver.getRouteViewDriverStream().onValue(_handleRouteViewChange, this, members);

	driver
		.getXhrInterceptorStream()
		.filter({type: 'sendingSearchRequest'})
		.map('.searchTerm')
		.onValue(_handleSearchRequest, this, members);
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
				isCustomRoute: true,
				driver: members.driver
			})
		);
	},

	registerRouteViewHandler: function(handler){
		return memberMap.get(this).handlerRegistry.registerHandler(handler);
	},

	registerSearchViewHandler: function(handler){
		return memberMap.get(this).searchViewHandlerRegistry.registerHandler(handler);
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


function _handleSearchRequest(router, members, searchTerm){
	if(_isSearchRefresh(members.currentRouteViewDriver, searchTerm)){
		return;
	}

	if(members.pendingSearchResultsView){
		members.pendingSearchResultsView.destroy();
	}

	members.pendingSearchResultsView = new SearchResultsView(searchTerm, router);
}

function _isSearchRefresh(routeViewDriver, searchTerm){
	return routeViewDriver && routeViewDriver.getParams()[0] === searchTerm;
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
		members.pendingSearchResultsView = null;
		routeViewDriver.destroy();
		return;
	}

	members.currentRouteViewDriver = routeViewDriver;

	if(_isCachedSearchView(members, routeViewDriver, route)){
		members.pendingSearchResultsView = new SearchResultsView(routeViewDriver.getParams()[0], router);
		_completePendingSearchResultsView(members, routeViewDriver, route);
	}
	else if(_isPendingSearchResultsViewRelevant(members.pendingSearchResultsView, routeViewDriver)){
		_completePendingSearchResultsView(members, routeViewDriver, route);
	}
	else{
		_completeRegularRouteView(members, routeViewDriver, route);
	}

	members.pendingSearchResultsView = null;
}

function _isCachedSearchView(members, routeViewDriver){
	return routeViewDriver.isSearchResultsView() && !members.pendingSearchResultsView;
}

function _isPendingSearchResultsViewRelevant(pendingSearchResultsView, routeViewDriver){
	if(!pendingSearchResultsView){
		return false;
	}

	return pendingSearchResultsView.getSearchTerm() === routeViewDriver.getParams()[0];
}

function _completePendingSearchResultsView(members, routeViewDriver){
	members.pendingSearchResultsView.setRouteViewDriver(routeViewDriver);
	members.driver.showNativeRouteView();
	members.searchViewHandlerRegistry.addTarget(members.pendingSearchResultsView);

	members.currentRouteView = members.pendingSearchResultsView;
}

function _completeRegularRouteView(members, routeViewDriver, route){
	var routeView = new RouteView(routeViewDriver, route);

	if(members.pendingSearchResultsView){
		members.pendingSearchResultsView.destroy();
	}

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
		members.modifiedNativeNavItem.destroy(); //make sure there is only one active at a time;
	}

	members.modifiedNativeNavItem = members.driver.getCurrentActiveNavItem();

	if(!members.modifiedNativeNavItem){
		return;
	}

	members.modifiedNativeNavItem.setActive(false);
	members.modifiedNativeNavItem.getEventStream().filter({eventName: 'invalidated'}).onValue(_removeNativeNavItemActive, members);
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
