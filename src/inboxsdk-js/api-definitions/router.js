var _ = require('lodash');


/**
 * @class
 * This namespace contains methods relevant to the different routes that the client can take on. When a new route is activated
 * the main content of the client is usually replaced.
 */
var Router = function(platformImplementationLoader){
	this._platformImplementationLoader = platformImplementationLoader;
};

_.extend(Router.prototype, /** @lends Router */ {

	/**
	 * Register a custom Route
	 * @param {RouteDescriptor} - routeDescriptor for the custom route
	 */
	createNewRoute: function(routeDescriptor){
		var self = this;
		this._platformImplementationLoader.load().then(function(platformImplementation){

			platformImplementation.Router.createNewRoute(routeDescriptor);

		});
	},

	/**
	 * Get a URL that can be used to navigate to a view.
	 * @param {string} name the name of the view you want to create a link to
	 * @param {string[]} paramArray an array of parameters you want to be included in the URL. The SDK handles some basic url processing to ensure it's compatible with the mail client's address scheme.
	 * @return {string} the formatted URL
	 */
	createLink: function(name, paramArray){
		if(!this._platformImplementationLoader.getPlatformImplementation()) {
			throw new Error("Called before InboxSDK finished loading");
		}

		return this._platformImplementationLoader.getPlatformImplementation().Router.createLink(name, paramArray);
	},

	/**
	 *  Change the route to be the one with the given name and have the given parameters
	 *  @param {string} name - name of the route to go to
	 *  @param {string[]} paramArray - array of parameters
	 */
	goto: function(name, paramArray){
		if(!this._platformImplementationLoader.getPlatformImplementation()) {
			throw new Error("Called before InboxSDK finished loading");
		}

		return this._platformImplementationLoader.getPlatformImplementation().Router.goto(name, paramArray);
	},


	/**
	 * Register a handler to be called for every time the current Route changes.
	 * @param {function(RouteView)} the function to be called
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
 * The function to call when the custom route is showing on screen
 * @type {function({RouteView})}
 */
onActivate: null

};
