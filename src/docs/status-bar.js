
/**
 * @class
 * Object that represents a status bar at the bottom of a compose view.
 */
var StatusBarView = /** @lends StatusBarView */{
	/**
	 * The status bar HTML element that you should fill with your apps content
	 * @type {HTMLElement}
	 */
	el: null,

	/**
	* destroys the status bar
	* @return {void}
	*/
	destroy: function() {},

	/**
	 * This property is set to true once the view is destroyed.
	 * @type {boolean}
	 */
	destroyed: false,

	/**
	 * Fires when the status bar is destroyed. This can be triggered by the .destroy method, or if
	 * the ComposeView is destroyed.
	 * @event StatusBarView#destroy
	 */
};


/**
 * @class
 * This type is passed into the {ComposeView.addStatusBar()} method as a way to configure the status bar shown.
 */
var StatusBarDescriptor = /** @lends StatusBarDescriptor */{
	/**
	 * The vertical height of the status bar in pixels
	 * ^optional
	 * ^default=40
	 * @type {Number}
	 */
	height: null,

	/**
	 * The order in which to show the status bars.
	 * ^optional
	 * ^default=0
	 * @type {Number}
	 */
	orderHint:null
};
