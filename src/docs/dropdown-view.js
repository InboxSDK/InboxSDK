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
	setPlacementOptions: function(options) {
		Object.assign(this._userPlacementOptions, options);
		this.emit('_placementOptionsUpdated');
	},

	/**
	 * Closes the dropdown
	 * @return {void}
	 */
	close: function() {
		if (!this.closed) {
			this.closed = true;
			this.emit('destroy');
			this._dropdownViewDriver.destroy();
		}
	}

	/**
	 * Fires when this DropdownView instance is closed.
	 * @event DropdownView#destroy
	 */
};
