/**
 * @class
 * Object that represents a visible thread view that the user has navigated to
 */
var ThreadView = /** @lends ThreadView */ {
  /**
   * Inserts a "notice bar" element below the thread subject. The element
   * defaults to having a yellow background color and specific padding to make
   * it look like a warning on the thread, but your code may override these
   * styles of the element.
   * @return {SimpleElementView}
   */
  addNoticeBar: function() {},

  /**
   * Inserts a content panel into the sidebar of a thread view. A content panel
   * simply displays your content to the user, typically in the form of a
   * sidebar. ThreadViews can have multiple content panels added to them and
   * the SDK will handle creating a tabbed interface if needed.
   * @param  {ContentPanelDescriptor} contentPanelDescriptor - The details of the content panel to add to the thread's sidebar.
   * @return {ContentPanelView}
   */
  addSidebarContentPanel: function() {},

  /**
   * Gets an Array of all the loaded MessageView objects currently in the thread.
   * See MessageView for more information on what "loaded" means.
   * Note that more messages may load into the thread later! If it's important
   * to get future messages, use {Conversations.registerMessageViewHandler} instead.
   * @return {MessageView[]}
   */
  getMessageViews: function() {},

  /**
   * Gets an Array of all the {MessageView} objects in the thread
   * regardless of their load state. See {MessageView} for more information
   * on what "loaded" means.
   * @return {MessageView[]}
   */
  getMessageViewsAll: function() {},

  /**
   * Gets the subject of this thread.
   * @return {string}
   */
  getSubject: function() {},

  /**
   * Gets the Gmail Thread ID of the thread and returns it as a Promise.
   * @return {Promise.<string>}
   */
  getThreadIDAsync: function() {},

  /**
   * Fires when the user hovers over a contact on any message in the thread {ContactHoverEvent}.
   * @event ThreadView#contactHover
   * @param {Contact} contact - the contact that was hovered over
   * @param {string} contactType - whether the hovered contact was a 'sender' or 'recipient'
   * @param {MessageView} messageView - the message view that the contact was a part of
   * @param {ThreadView} threadView - the thread view that the contact was a part of
   */

  /**
   * This property is set to true once the view is destroyed.
   * @type {boolean}
   */
  destroyed: false

  /**
   * Fires when the thread view is no longer visible (i.e. the user navigates away from the thread).
   * @event ThreadView#destroy
   */
};

/**
 * @class
 * This type is passed into the {ThreadView.addSidebarContentPanel()} method as a way to configure the content panel shown.
 * ContentPanels are typically shown in a sidebar and when multiple are shown they are displayed in a multi tab interface.
 */
var ContentPanelDescriptor = /** @lends ContentPanelDescriptor */ {
  /**
   * The element to display in the content panel.
   * @type {HTMLElement}
   */
  el: null,

  /**
   * The text to show in the tab.
   * @type {string}
   */
  title: null,

  /**
   * URL for the icon to show in the tab. Should be a local extension file URL or a HTTPS url.
   * @type {string}
   */
  iconUrl: null,

  /**
   * (Currently Inbox-only) In Inbox, when a thread is open but the sidebar isn't, then
   * buttons to open the sidebar will be shown next to the thread. Each button may be
   * associated with multiple sidebars. The sidebars are grouped into buttons based on
   * this appName property, their app's appName passed to `InboxSDK.load`, or the title
   * property.
   * ^optional
   * @type {string}
   */
  appName: null,

  /**
   * (Currently Inbox-only) Overrides the icon for the sidebar-opener button.
   * ^optional
   * @type {string}
   */
  appIconUrl: null,

  /**
   * A string can be passed to identify this panel so that user preferences
   * specific to this panel may be saved. If this property is not present, then
   * the title will be used as the id.
   * ^optional
   * @type {string}
   */
  id: null,

  /**
   * Hide the title bar if this is the only sidebar panel attached to the thread.
   * If multiple panels are added (including panels from other extensions) then
   * the title bar will appear so that the user can adjust the panels with the
   * title bar controls.
   * ^optional
   * ^default=false
   * @type {boolean}
   */
  hideTitleBar: null,

  /**
   * If multiple content panels for your app are added then they will be ordered by this value.
   * ^optional
   * ^default=0
   * @type {number}
   */
  orderHint: null
};
