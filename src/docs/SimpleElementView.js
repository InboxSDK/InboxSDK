/**
 * @class
 * Object that represents a status bar at the bottom of a compose view.
 */
var SimpleElementView = /** @lends SimpleElementView */{
	/**
	 * An element that you should modify and fill with your app's content.
	 * @type {HTMLElement}
	 */
	el: null,

	/**
	* Removes the element and executes any necessary clean-up.
	* @return {void}
	*/
	destroy: function() {},

	/**
	 * This property is set to true once the view is destroyed.
	 * @type {boolean}
	 */
	destroyed: false,

	/**
	 * Fires when the view is destroyed. This can be triggered by the app calling
	 * the destroy() method or by the InboxSDK internally calling the destroy()
	 * method.
	 * @event SimpleElementView#destroy
	 */
};
