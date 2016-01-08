/**
* @class
* CollapsibleSectionViews allow you to display additional content on {ListRouteView}s. They are
* typically rendered as additional content above the list of threads below. The visual style
* is similar to that of multiple inbox sections used in native Gmail and Inbox. Note that the
* rendering may vary slightly depending on the actual ListRouteView that the CollapsibleSectionView
* is rendered in. For example, CollapsibleSectionViews rendered on search results pages use different
* header styles to match Gmail's style more accurately.
*
* You can either render rows (that are visually similar to Gmail/Inbox rows) or custom content in
* your CollapsibleSectionView. Until content is provided, the SectionView will simply display
* a "Loading..." indicator. See {ListRouteView.addCollapsibleSection} for more information.
* @extends SectionView
*/
var CollapsibleSectionView = /** @lends CollapsibleSectionView */ {

	/**
	* @param {boolean} value - Whether to collapse (minimize) the section view.
	* @return {void}
	*/
	setCollapsed: function(){},

	/**
	* Removes this section from the current Route
	* @return {void}
	*/
	remove: function(){},

	destroy: function(){},

	/**
	 * This property is set to true once the view is destroyed.
	 * @type {boolean}
	 */
	destroyed: false,

	/**
	* Fires when the CollapsibleSectionView is no longer visible.
	* @event CollapsibleSectionView#destroy
	*/

	/**
	* Fires when the CollapsibleSectionView is expanded.
	* @event CollapsibleSectionView#expanded
	*/

	/**
	* Fires when the CollapsibleSectionView is collapsed.
	* @event CollapsibleSectionView#collapsed
	*/

};
