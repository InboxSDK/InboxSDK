var _ = require('lodash');


/**
 * @class
 * This namespace contains functionality associated with creating your own content inside Gmail or Inbox. It allows you to define "Routes"
 * which define a full page of content and an associated URL space for which they are active. You can think of routes as different pages
 * in your application. Gmail and Inbox already have a few routes built in (Inbox, Sent, Drafts, etc). This namespace allows you to define
 * your own.
 *
 * This is typically used when you want to create content to fill the main area of Gmail or Inbox.
 *
 * Every route has a URL associated with it and can have optional parameters. However, you never construct these URL's manually.
 * Since routes are required to have a name, the SDK will take care of creating a URL that will work in Gmail/Inbox for your Route. Since these
 * URL's may change due to implementations of Gmail/Inbox, you should always create new links when trying to set URL on elements or simply use
 * the goto function which naviagtes to the created link automatically.
 *
 * When the user naviagtes to a route (either programatically via goto or clicking on a link generated by createLink), your callback is called with
 * an instance of a RouteView. You would typically add your content to this RouteView.
 */
var Router = function(platformImplementationLoader){
	this._platformImplementationLoader = platformImplementationLoader;
};

_.extend(Router.prototype, /** @lends Router */ {

	/**
	 * Register a new named Route. The RouteDescriptor which you pass to this method defines the name, and implicitly, the URL of the route
	 * as well as a callback for when the route becomes active (the route is navigated to).
	 * @param {RouteDescriptor} - routeDescriptor for the custom route
	 */
	createNewRoute: function(routeDescriptor){
		var self = this;
		this._platformImplementationLoader.load().then(function(platformImplementation){
			platformImplementation.Router.createNewRoute(routeDescriptor);
		});
	},

	/**
	 * Get a URL that can be used to navigate to a view. You'll typically want to use this to set the href of an <a> element or similar.
	 * @param {string} name the name of the view you want to create a link to
	 * @param {string[]} paramArray an array of parameters you want to be included in the URL. The SDK handles encoding these parameters
	 * into the URL so that it's compatible with the mail client's address scheme.
	 * @return {string} the encoded URL
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
	 * Register a handler to be called for every time the current Route changes. You typically won't use this for your own routes (because you
	 * have already passed in an onActivate callback when you create your own route), but you may use it to observe route changes inside Gmail/Inbox.
	 * For example, you may want to know when the user naviages to their Sent folder or similar.
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
 * The function to call when the custom route is navigated to.
 * @type {function({RouteView})}
 */
onActivate: null

};
