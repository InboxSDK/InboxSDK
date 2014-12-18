var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;

var HandlerRegistry = require('../lib/handler-registry');

var Route = require('../views/route-view/route');
var RouteView = require('../views/route-view/route-view');

var Router = function(appId, driver, navMenu){
	EventEmitter.call(this);

	this._appId = appId;
	this._driver = driver;
	this._navMenu = navMenu;

	this._routes = [];

	this._currentRouteViewDriver = null;
	this._handlerRegistry = new HandlerRegistry();

	this._customRoutes = [];

	this._lastNativeRouteName = null;

	this._setupNativeRoutes();
	this._watchForRouteViewChanges();
};

Router.prototype = Object.create(EventEmitter.prototype);


_.extend(Router.prototype,  {

	createLink: function(name, paramArray){
		return this._driver.createLink(name, paramArray);
	},

	goto: function(name, paramArray){
		this._driver.gotoView(name, paramArray);
	},

	createNewRoute: function(routerDescription){
		this._customRoutes.push(routerDescription);

		this._routes.push(
			new Route({
				name: routerDescription.name,
				isCustomView: true,
				driver: this._driver
			})
		);
	},

	registerRouteViewHandler: function(handler){
		return this._handlerRegistry.registerHandler(handler);
	},

	/* deprecated */
	gotoView: function(name, paramArray){
		this.goto(name, paramArray);
	},

	/* deprecated */
	getDescriptor: function(name){
		return _.find(this._routes, function(route){
			return route.getName() === name;
		});
	},

	/* deprecated */
	registerCustom: function(routerDescription){
		this.createNewRoute(routerDescription);
	},

	_setupNativeRoutes: function(){
		var nativeViewNames = this._driver.getNativeRouteNames();

		var self = this;
		nativeViewNames.forEach(function(viewName){

			self._routes.push(
				new Route({
					name: viewName,
					isCustomView: false,
					driver: self._driver
				})
			);

		});
	},

	_watchForRouteViewChanges: function(){
		this._driver.getRouteViewDriverStream().onValue(this, '_handleRouteViewChange');
	},

	_handleRouteViewChange: function(routeViewDriver){
		this._updateNavMenu(routeViewDriver);

		if(this._currentRouteViewDriver){
			this._currentRouteViewDriver.destroy();
		}

		var route = this.getDescriptor(routeViewDriver.getName());
		if(!route){
			routeViewDriver.destroy();
			return;
		}

		this._currentRouteViewDriver = routeViewDriver;

		var routeView = new RouteView(routeViewDriver, route);

		if(route.isCustomView()){
			this._driver.showCustomRouteView(routeViewDriver.getCustomViewElement());
			this._informRelevantCustomRoutes(routeView);
		}
		else{
			this._driver.showNativeRouteView();
		}

		this._handlerRegistry.addTarget(routeView);

		this.emit('change', {routeView: routeView});
	},

	_informRelevantCustomRoutes: function(routeView){
		this._customRoutes
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
	},

	_updateNavMenu: function(newRouteViewDriver){
		var oldRouteViewDriver = this._currentRouteViewDriver;

		if(oldRouteViewDriver && !oldRouteViewDriver.isCustomView()){
			if(newRouteViewDriver.isCustomView()){
				this._lastNativeRouteName = oldRouteViewDriver.getName();
				this._navMenu.removeNativeNavItemActive();
				return;
			}
		}
		else if(this._lastNativeRouteName && !newRouteViewDriver.isCustomView()){
			if(this._lastNativeRouteName === newRouteViewDriver.getName()){
				this._navMenu.restoreNativeNavItemActive();
			}
			else{
				this._navMenu.unhandleNativeNavItem();
			}
		}
	}

});

module.exports = Router;
