var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;

var Map = require('es6-unweak-collections').Map;
var membersMap = new Map();

/**
 * @class
 * RouteViews are created when the user navigates to a specific url or page. RouteViews can be "custom", those
 * that the application developer registers, or they can be "builtin" which are those that the email client natively
 * supports like "Sent", "Drafts", or "Inbox"
 *
 * When using custom RouteViews, you'll typicall register a RouteView on the Router class and then be given a RouterView
 * when the user navigates to it. You'll typically add your own custom content to the RouteView by using the
 * <code>getElement</code> function.
 *
 * When navigating to RouteViews, parameters can be supplied (see <code>Router.goto</code>) which can later be fetched using <code>getParams</code>.
 */
var RouteView = function(routeViewImplementation, route){
	EventEmitter.call(this);

	var members = {};
	membersMap.set(this, members);

	members.routeViewImplementation = routeViewImplementation;
	members.route = route;

	_bindToEventStream(routeViewImplementation, this);
};

RouteView.prototype = Object.create(EventEmitter.prototype);

_.extend(RouteView.prototype, /** @lends RouteView */{
	/**
	 * Get the name of the RouteView. If this is a custom route then this is the name you registered the route with.
	 * @return {string}
	 */
	getName: function(){
		return membersMap.get(this).routeViewImplementation.getName();
	},

	/**
	 * Get the URL parameters of this RouteView instance
	 * @return {stringp[]}
	 */
	getParams: function(){
		return membersMap.get(this).routeViewImplementation.getParams();
	},

	/**
	 * Indicates whether this RouteView is a custom route, or native to the web client
	 * @return {Boolean}
	 */
	isCustomRoute: function(){
		return membersMap.get(this).routeViewImplementation.isCustomRoute();
	},

	/**
	* Gets the element representing the content area of this RouteView
	* @return {HTMLElement}
	*/
	getElement: function(){
		return membersMap.get(this).routeViewImplementation.getCustomViewElement();
	},

	destroy: function(){
		membersMap.delete(this);
	}

	/**
	* Fires when this RouteView instance is navigated away from
	* @event RouteView#unload
	*/

});


function _bindToEventStream(routeViewImplementation, routeView){
	routeViewImplementation.getEventStream().onEnd(routeView, 'emit', 'unload');
}

module.exports = RouteView;
