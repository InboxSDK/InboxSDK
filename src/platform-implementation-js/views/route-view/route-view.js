var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;

/**
 * @class
 * Object that represents a specific route view instance
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
	 * Get the name of the RouteView
	 * @return {string}
	 */
	getName: function(){
		return this._routeViewImplementation.getName();
	},

	/**
	 * Get the URL parameters of this RouteView instance
	 * @return {array[{string}]}
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

	getElement: function(){
		return this._routeViewImplementation.getCustomViewElement();
	},

	_bindToEventStream: function(){
		this._routeViewImplementation.getEventStream().onEnd(this, 'emit', 'unload');
	}

	/**
	 * Fires an "unload" event when this RouteView instance is no longer needed
	 */

});

module.exports = RouteView;
