
/**
 * @class
 * @extends SimpleElementView
 * Object that represents a status bar at the bottom of a compose view.
 */
var StatusBarView = /** @lends StatusBarView */{
	/**
	* sets the height of the status bar
	* @param {number} height - Desired height for status bar in pixels.
	* @return {void}
	*/
	setHeight: function() {},
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
