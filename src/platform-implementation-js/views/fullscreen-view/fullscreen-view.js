var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;

/**
 * @class
 * Object that represents a specific fullscreen view instance
 */
var FullscreenView = function(fullscreenViewImplementation, fullscreenViewDescriptor){
	EventEmitter.call(this);

	this._fullscreenViewImplementation = fullscreenViewImplementation;
	this._fullscreenViewDescriptor = fullscreenViewDescriptor;

	this._bindToEventStream();
};

FullscreenView.prototype = Object.create(EventEmitter.prototype);

_.extend(FullscreenView.prototype, /** @lends FullscreenView */{

	__memberVariables: [
		{name: '_fullscreenViewDescriptor', destroy: false},
		{name: '_fullscreenViewImplementation', destroy: true}
	],

	/**
	 * Get the name of the FullscreenView
	 * @return {string}
	 */
	getName: function(){
		this._fullscreenViewImplementation.getName();
	},

	/**
	 * Get the URL parameters of this FullscreenView instance
	 * @return {array[{string}]}
	 */
	getParams: function(){
		return this._fullscreenViewImplementation.getParams();
	},

	/**
	 * Indicates whether this FullscreenView is a custom view, or native to the web client
	 * @return {Boolean}
	 */
	isCustomView: function(){
		return this._fullscreenViewImplementation.isCustomView();
	},

	/* deprecated */
	getDescriptor: function(){
		return this._fullscreenViewDescriptor;
	},

	getElement: function(){
		return this._fullscreenViewImplementation.getCustomViewElement();
	},

	_bindToEventStream: function(){
		this._fullscreenViewImplementation.getEventStream().onEnd(this, 'emit', 'unload');
	}

	/**
	 * Fires an "unload" event when this FullscreenView instance is no longer needed
	 */

});

module.exports = FullscreenView;
