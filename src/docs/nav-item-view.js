/**
* @class
* NavItemsViews are the elements placed inside a NavMenu. Each NavItemView
* represents an entry in the left navigation of Gmail or Inbox. These NavItemViews
* can be nested.
*
* Typically the main action of a NavItemView is performed when the user clicks on the
* main text. However, you can also provide accessories which are secondary actions which
* typically appear on the right side of the NavItemView but may be rendered in other ways.
*
* For nested NavItemViews, the SDK will handle collapsing and expanding children depending
* on user input.
*/
var NavItemView = /** @lends NavItemView */ {

	/**
	* Add a nested child NavItemView
	* ^gmail
	* ^inbox
	* @param {NavItemDescriptor} navItemDescriptor - A single descriptor for the nav item or stream of NavItemDescriptors.
	* @return {NavItemView}
	*/
	addNavItem: function(){},

	/**
	* Remove this NavItemView from its parent
	* ^gmail
	* ^inbox
	* @return {void}
	*/
	remove: function(){},

	/**
	* Whether the NavItemView is currently collapsed and hiding its children
	* ^gmail
	* ^inbox
	* @return {boolean}
	*/
	isCollapsed: function(){},

	/**
	* Collapse or uncollapse this NavItemView
	* ^gmail
	* ^inbox
	* @param {boolean} collapseValue - whether to collapse or uncollapse
	* @return {void}
	*/
	setCollapsed: function(){},

	/**
	 * This property is set to true once the view is destroyed.
	 * ^gmail
	 * ^inbox
	 * @type {boolean}
	 */
	destroyed: false,

	/**
	 * Fires when this view is destroyed.
	 * @event NavItemView#destroy
	 */

};
