/**
 * @class
 * This namespace contains methods and types related to the UI Elements that are available Globally in Gmail.
 */
var Global = /** @lends Global */ {
  /**
   * Adds an icon in the "global app" icon area on the right side of Gmail. When the user clicks the icon
   * the global sidebar will be open with the el displayed.
   * Only works in material Gmail UI.
   * @param  {ContentPanelDescriptor} contentPanelDescriptor - The details of the content panel to add to the global sidebar.
   * @return {Promise.<ContentPanelView>}
   */
  addSidebarContentPanel: function() {},

  /**
   * Adds an supprt item right before the last separator in the Gmail support menu.
   * @param  {SupportItemDescriptor} supportItemDescriptor - The details of the support item to be added to the Gmail support menu.
   * @return {SupportItemView}
   */
  addSupportItem: function() {}
};
