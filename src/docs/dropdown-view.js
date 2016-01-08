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
	 * This property is set to true once the view is destroyed.
	 * @type {boolean}
	 */
	destroyed: false,

	/**
	 * Fires when this DropdownView instance is closed.
	 * @event DropdownView#destroy
	 */
};
