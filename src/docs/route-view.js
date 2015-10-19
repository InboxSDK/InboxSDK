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
	 * Get the ID of the RouteView. This is the same routeID that you give {Router.goto()} or {Router.createLink()}.
	 * @return {string}
	 */
	getRouteID: function(){},

	/**
	* Get the type of the route, either custom or native
	* @return {string}
	*/
	getRouteType: function(){},

	/**
	 * Get the URL parameters of this RouteView instance
	 * @return {string[]}
	 */
	getParams: function(){}

	/**
	* Fires when this RouteView instance is navigated away from
	* @event RouteView#destroy
	*/

};
