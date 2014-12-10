var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');


/**
 * @class
 * This namespace contains methods relevant to the different "fullscreen views" that the client can take on. To be clear "fullscreen"
 * means everything that is not in the top header bar (where search is) or the left navigation bar where the labels are listed.
 */

var FullscreenViews = function(platformImplementationLoader){
	EventEmitter.call(this);

	this._platformImplementationLoader = platformImplementationLoader;

	this._watchForFullscreenViewChanges();
};

FullscreenViews.prototype = Object.create(EventEmitter.prototype);

_.extend(FullscreenViews.prototype, /** @lends FullscreenViews */ {

	/**
	 * Register a custom FullscreenView
	 * @type {FullscreenViewDescriptor} - options for the custom fullscreen view
	 */
	registerCustom: function(options){
		var self = this;
		this._platformImplementationLoader.load().then(function(platformImplementation){

			platformImplementation.FullscreenViews.registerCustom(options);

		});
	},

	/**
	 * Get a URL that can be used to navigate to a view.
	 * @param {string} name the name of the view you want to create a link to
	 * @param {array[{string}]} paramArray an array of parameters you want to be included in the URL. The SDK handles some basic url processing to ensure it's compatible with the mail client's address scheme.
	 * @return {string} the formatted URL
	 */
	createLink: function(name, paramArray){
		if(!this._platformImplementationLoader.getPlatformImplementation()) {
			throw new Error("Called before InboxSDK finished loading");
		}

		return this._platformImplementationLoader.getPlatformImplementation().FullscreenViews.createLink(name, paramArray);
	},

	/**
	 *  Change the fullscreen view to be the view with the given name and have the given parameters
	 *  @param {string} name - name of the view to go to
	 *  @param {array[{string}]} paramArray - array of parameters
	 */
	gotoView: function(name, paramArray){
		if(!this._platformImplementationLoader.getPlatformImplementation()) {
			throw new Error("Called before InboxSDK finished loading");
		}

		return this._platformImplementationLoader.getPlatformImplementation().FullscreenViews.gotoView(name, paramArray);
	},

	/* deprecated */
	getDescriptor: function(name){
		if(!this._platformImplementationLoader.getPlatformImplementation()) {
			throw new Error("Called before InboxSDK finished loading");
		}

		return this._platformImplementationLoader.getPlatformImplementation().FullscreenViews.getDescriptor(name);
	},

	_watchForFullscreenViewChanges: function(){
		var self = this;
		this._platformImplementationLoader.load().then(function(platformImplementation){

			platformImplementation.FullscreenViews.on('change', function(event){
				self.emit('change', event);
			});

		});
	}

	/**
	 * fires event "change" for when a new FullscreenView is displayed
	 */

});

module.exports = FullscreenViews;


/**
 * @class
 * This type is passed into FullscreenViews.registerCustom to register a new custom fullscreen view type
 */
var FullscreenViewDescriptor = /** @lends FullscreenViewDescriptor */ {

/**
 * The name of the custom view.
 * @type {string}
 */
name: null,

/**
 * The function to call when the custom fullscreen view is showing on screen
 * @type {function({FullscreenView})}
 */
onActivate: null

};
