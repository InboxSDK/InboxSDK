/**
* @class
* SectionViews allow you to display additional content on {ListRouteView}s. They are
* typically rendered as additional content above the list of threads below. The visual style
* is similar to that of multiple inbox sections used in native Gmail and Inbox. Note that the
* rendering may vary slightly depending on the actual ListRouteView that the SectionView
* is rendered in. For example, SectionViews rendered on search results pages use different
* header styles to match Gmail's style more accurately.
*
* You can either render rows (that are visually similar to Gmail/Inbox rows) or custom content in
* your SectionView. Until content is provided, the SectionView will simply display
* a "Loading..." indicator. See {ListRouteView.addSection} for more information.
*/
var SectionView = /** @lends SectionView */ {

	/**
	* Removes this section from the current Route.
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
	* Fires when the SectionView is no longer visible.
	* @event SectionView#destroy
	*/

};

/**
* @class
* Represents the a single row to render in {SectionView}s and {CollapsibleSectionView}s
*/
var RowDescriptor = /** @lends RowDescriptor */ {

	/**
	 * First textual column
	 * @type {string}
	 */
	title: null,

	/**
	 * Second textual column
	 * @type {string}
	 */
	body: null,

	/**
	 * Last text right-aligned. Often used for dates.
	 * @type {string}
	 */
	shortDetailText: null,

	/**
	* Whether the row should be rendered as read or unread similar to Gmail and Inbox styles.
	* @type {string}
	*/
	isRead: null,

	/**
	* Any labels that should be rendered.
	* @type {LabelDescriptor[]}
	*/
	labels: null,

	/**
	* An optional url to an icon to display on the left side of the row
	* ^optional
	* ^default=null
	* @type {string}
	*/
	iconUrl: null,

	/**
	* An optional class to apply to the icon.
	* ^optional
	* ^default=null
	* @type {string}
	*/
	iconClass: null,

	/**
	 * The name of the route to navigate to when the row is clicked on.
	 * ^optional
	 * ^default=null
	 * @type {string}
	 */
	routeID: null,

	/**
	 * The parameters of the route being navigated to when the row is clicked on.
	 * ^optional
	 * ^default=null
	 * @type {string[]}
	 */
	routeParams: null,


	/**
	 * Callback for when the row is clicked on.
	 * ^optional
	 * ^default=null
	 * @type {function}
	 */
	onClick: null

};


/**
* @class
* The properties required to create a {SectionView} or {CollapsibleSectionView}.
*/
var SectionDescriptor = /** @lends SectionDescriptor */ {

	/**
	* Main title
	* @type {string}
	*/
	title: null,

	/**
	* Subtitle
	* ^optional
	* ^default=null
	* @type {string}
	*/
	subtitle: null,

	/**
	* Link to display in the summary area of the SectionView. Typically page
	* counts are displayed here.
	* ^optional
	* ^default=null
	* @type {string}
	*/
	titleLinkText: null,

	/**
	* A function to call when the title link has been clicked.
	* ^optional
	* ^default=null
	* @type {function()}
	*/
	onTitleLinkClick: null,

	/**
	* Whether to display a dropdown arrow for more options on the collapsible section.
	* ^optional
	* ^default=false
	* @type {boolean}
	*/
	hasDropdown: null,

	/**
	* A function to call when the dropdown is opened. Your function is passed an
	* event object with a single {dropdown} property.
	* ^optional
	* ^default=null
	* @type {func(event)}
	*/
	onDropdownClick: null,

	/**
	* The rows that should be shown.
	* ^optional
	* ^default=null
	* @type {RowDescriptor[]}
	*/
	tableRows: null,

	/**
	* An arbitrary HTML element to place above the table rows but below the title.
	* ^optional
	* ^default=null
	* @type {HTMLElement}
	*/
	contentElement: null,

	/**
	* A link to place in the footer of the SectionView.
	* ^optional
	* ^default=null
	* @type {string}
	*/
	footerLinkText: null,

	/**
	* A function to call when the link in the footer is clicked.
	* ^optional
	* ^default=null
	* @type {func(event)}
	*/
	onFooterLinkClick: null
};
