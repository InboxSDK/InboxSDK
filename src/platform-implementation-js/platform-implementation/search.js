'use strict';

var _ = require('lodash');
var Bacon = require('baconjs');
var Map = require('es6-unweak-collections').Map;

var HandlerRegistry = require('../lib/handler-registry');

var Route = require('../views/route-view/route');
var RouteView = require('../views/route-view/route-view');

var SearchResultsView = require('../views/search-results-view');

var memberMap = new Map();

var Search = function(appId, driver){
	var members = {};
	memberMap.set(this, members);

	members.appId = appId;
	members.driver = driver;

	members.currentRouteViewDriver = null;
	members.currentSearchResultsView = null;
	members.pendingSearchResultsView = null;

	members.handlerRegistry = new HandlerRegistry();

	driver.getRouteViewDriverStream().onValue(_handleRouteViewChange, members);

	driver
		.getXhrInterceptorStream()
		.filter(function(event){
			return event.type === 'sendingSearchRequest';
		})
		.map('.searchTerm')
		.onValue(_handleSearchRequest, members);
};


_.extend(Search.prototype,  {

	registerSearchResultsViewHandler: function(handler){
		return memberMap.get(this).handlerRegistry.registerHandler(handler);
	}

});

function _handleSearchRequest(members, searchTerm){
	if(_isSearchRefresh(members.currentRouteViewDriver, searchTerm)){
		return;
	}

	if(members.pendingSearchResultsView){
		members.pendingSearchResultsView.destroy();
	}

	members.pendingSearchResultsView = new SearchResultsView(searchTerm, members.driver, members.appId);
}

function _isSearchRefresh(routeViewDriver, searchTerm){
	return routeViewDriver && routeViewDriver.getParams() && routeViewDriver.getParams()[0] === searchTerm;
}

function _handleRouteViewChange(members, routeViewDriver){
	if(members.currentSearchResultsView){
		members.currentSearchResultsView.destroy();
	}

	members.currentRouteViewDriver = routeViewDriver;

	if(_isCachedSearchView(members, routeViewDriver)){
		members.pendingSearchResultsView = new SearchResultsView(routeViewDriver.getParams()[0], members.driver, members.appId);
	}
	else if(!_isPendingSearchResultsViewRelevant(members.pendingSearchResultsView, routeViewDriver)){
		return;
	}

	members.pendingSearchResultsView.setRouteViewDriver(routeViewDriver);
	members.handlerRegistry.addTarget(members.pendingSearchResultsView);
	members.currentSearchResultsView = members.pendingSearchResultsView;

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



module.exports = Search;
