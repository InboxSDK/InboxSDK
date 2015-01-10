var _ = require('lodash');


var Router = function(platformImplementationLoader){
	this._platformImplementationLoader = platformImplementationLoader;
};

_.extend(Router.prototype, /** @lends Router */ {

	/**
	 * Register a new named Route. The RouteDescriptor which you pass to this method defines the name, and implicitly, the URL of the route
	 * as well as a callback for when the route becomes active (the route is navigated to).
	 * @param {RouteDescriptor} routeDescriptor - routeDescriptor for the custom route
	 */
	createNewRoute: function(routeDescriptor){
		var self = this;
		this._platformImplementationLoader.load().then(function(platformImplementation){
			platformImplementation.Router.createNewRoute(routeDescriptor);
		});
	},

	createLink: function(name, paramArray){
		if(!this._platformImplementationLoader.getPlatformImplementation()) {
			throw new Error("Called before InboxSDK finished loading");
		}

		return this._platformImplementationLoader.getPlatformImplementation().Router.createLink(name, paramArray);
	},

	goto: function(name, paramArray){
		if(!this._platformImplementationLoader.getPlatformImplementation()) {
			throw new Error("Called before InboxSDK finished loading");
		}

		return this._platformImplementationLoader.getPlatformImplementation().Router.goto(name, paramArray);
	},


	/**
	 * Register a handler to be called for every time the current Route changes. You typically won't use this for your own routes (because you
	 * have already passed in an onActivate callback when you create your own route), but you may use it to observe route changes inside Gmail/Inbox.
	 * For example, you may want to know when the user naviages to their Sent folder or similar.
	 * @param {function(RouteView)} handler - the function to be called when the Route changes
	 * @return {function} a function to call when you want to unregister this handler
	 */
	registerRouteViewHandler: function(handler){
		return this._platformImplementationLoader.registerHandler('Router', 'RouteView', handler);
	},


	/* deprecated */
	gotoView: function(name, paramArray){
		this.goto(name, paramArray);
	},

	/* deprecated */
	registerCustom: function(routeDescriptor){
		this.createNewRoute(routeDescriptor);
	}

});

module.exports = Router;


/**
 * @class
 * This type is passed into Router.createNewRoute to register a new custom route
 */
var RouteDescriptor = /** @lends RouteDescriptor */ {

/**
 * The name of the custom route.
 * @type {string}
 */
name: null,

/**
 * The function to call when the custom route is navigated to.
 * @type {function({routeView: RouteView})}
 */
onActivate: null

};
