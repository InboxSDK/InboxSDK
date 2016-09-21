/**
 * @class
 * RouteViews represent pages within Gmail or Inbox that a user can navigate to. RouteViews can be "custom", those
 * that the application developer registers, or they can be "builtin" which are those that the email client natively
 * supports like "Sent", "Drafts", or "Inbox"
 *
 * This class mostly just gives you metadata about the route, most of the functionality to modify the route are
 * defined in subclasses like {ListRouteView} and {CustomRouteView}, which you get by
 * handling those types specifically in the Router.
 */
var RouteView = /** @lends RouteView */{

	/**
	 * Get the ID of the RouteView. This is the same routeID that you give
	 * {Router.goto()} or {Router.createLink()}. This will be a value from
	 * {NativeRouteIDs}.
	 * @return {string}
	 */
	getRouteID: function(){},

	/**
	* Get the type of the route. This will be one of the values in {RouteTypes}.
	* @return {string}
	*/
	getRouteType: function(){},

	/**
	 * Get the URL parameters of this RouteView instance. This will be an object
	 * where the properties are strings.
	 * @return {Object}
	 */
	getParams: function(){},

	/**
	 * This property is set to true once the view is destroyed.
	 * @type {boolean}
	 */
	destroyed: false,

	/**
	* Fires when this RouteView instance is navigated away from
	* @event RouteView#destroy
	*/

};
