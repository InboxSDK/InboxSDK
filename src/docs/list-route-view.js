/**
* @class
* ListRouteViews represent pages within Gmail or Inbox that show a list of emails. Typical examples are the Inbox, Sent Mail,
* Drafts, etc. However, views like the Conversation view or Settings would *not* be a ListRouteView.
* @extends RouteView
*/
var ListRouteView = /** @lends ListRouteView */ {

	/**
	 * Adds a collapsible section to the top of the page and returns
	 * a CollapsibleSectionView which represents it.
	 * ^gmail
	 * @param {SectionDescriptor|Stream.<SectionDescriptor>} options - configuration options of the CollapsibleSectionView
	 * @returns {CollapsibleSectionView}
	 */
	addCollapsibleSection: function(){},

	/**
	 * Adds a non-collapsible section to the top of the page and returns
	 * a SectionView which represents it.
	 * ^gmail
	 * @param {SectionDescriptor|Stream.<SectionDescriptor>} options - configuration options of the SectionView
	 * @returns {SectionView}
	 */
	addSection: function(){},

	/**
	 * Simulates a click on the Gmail thread list refresh button.
	 * ^gmail
	 * @returns {void}
	 */
	refresh: function(){}

};
