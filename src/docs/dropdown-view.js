/**
 * @class
 * This class represents a Dropdown returned by the SDK to the app in various places.
 * The dropdown can be filled with your apps content, but it automatically handles dismissing
 * the dropdown on certain user actions.
 */
var DropdownView = /** @lends DropdownView */ {

	/**
	 * The HTML element that is displayed in the dropdown.
	 * @type {HTMLElement}
	 */
	el: null,

	/**
	 * This allows the position settings of the dropdown to be changed.
	 * @param  {PositionOptions} options
	 * @return {void}
	 */
	setPlacementOptions: function() {},

	/**
	 * Closes the dropdown
	 * @return {void}
	 */
	close: function() {},

	/**
	 * Causes the dropdown element to recalculate its position relative to its button anchor. Use this method if you've changed the height of the dropdown while it is displayed.
	 * @return {void}
	 */
	reposition: function() {},

	/**
	 * This property is set to true once the view is destroyed.
	 * @type {boolean}
	 */
	destroyed: false,

	/**
	 * Fires when this DropdownView instance is closed.
	 * @event DropdownView#destroy
	 */

	/**
	 * Fires when this DropdownView instance is about to close itself in response
	 * to a user clicking outside of the dropdown or pressing escape. This event
	 * may be canceled in order to stop the dropdown from closing itself. You may
	 * want to do this if you have created a "subdropdown" menu from this
	 * dropdown that isn't part of this DropdownView's element, and you don't
	 * want clicks on your subdropdown to cause this DropdownView to auto-close.
	 * @event DropdownView#preautoclose
	 * @param {string} type - This will be "outsideInteraction" if the cause is a
	 * click or focus outside of the DropdownView, or "escape" if the cause is the
	 * user pressing the Escape key.
	 * @param {Event} cause - This is the DOM event that is triggering the DropdownView
	 * to auto-close. If `type` is "outsideInteraction", then you may want to check if
	 * your your subdropdown element contains the `cause.target` element.
	 * @param {function} cancel - Calling this method will prevent this DropdownView
	 * from closing itself.
	 */
};
