var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;

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

	this._routeViewImplementation = routeViewImplementation;
	this._route = route;

	this._bindToEventStream();
};

RouteView.prototype = Object.create(EventEmitter.prototype);

_.extend(RouteView.prototype, /** @lends RouteView */{
	/**
	 * Get the name of the RouteView. If this is a custom route then this is the name you registered the route with.
	 * @return {string}
	 */
	getName: function(){
		return this._routeViewImplementation.getName();
	},

	/**
	 * Get the URL parameters of this RouteView instance
	 * @return {stringp[]}
	 */
	getParams: function(){
		return this._routeViewImplementation.getParams();
	},

	/**
	 * Indicates whether this RouteView is a custom view, or native to the web client
	 * @return {Boolean}
	 */
	isCustomView: function(){
		return this._routeViewImplementation.isCustomView();
	},

	/* deprecated */
	getDescriptor: function(){
		return this._route;
	},

	/**
	* Gets the element representing the content area of this RouteView
	* @return {HTMLElement}
	*/
	getElement: function(){
		return this._routeViewImplementation.getCustomViewElement();
	},






	_bindToEventStream: function(){
		this._routeViewImplementation.getEventStream().onEnd(this, 'emit', 'unload');
	}

	/**
	* Fires when this RouteView instance is navigated away from
	* @event RouteView#unload
	*/

});

module.exports = RouteView;
