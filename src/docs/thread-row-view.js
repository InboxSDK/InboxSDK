/**
* @class
* Object that represents a visible thread row view in a list of rows
*/
var ThreadRowView = /** @lends ThreadRowView */ {

  /**
   * Adds a label to the thread row view. This label will appear like a normal
   * Gmail label, but it is purely a temporary visual modification. This method
   * does not cause any change to persist to the user's thread in Gmail.
   * @param {LabelDescriptor|Stream.<LabelDescriptor>} labelDescriptor - An options object for the label.
   * @return {void}
   */
  addLabel: function(){},

  /**
   * Adds an image to the thread row view.
   * @param {ImageDescriptor|Stream.<ImageDescriptor>} imageDescriptor - An options object for the image.
   * @return {void}
   */
  addImage: function(){},

  /**
   * Adds an icon style button to this row, placed right next to the star button.
   * @param {ThreadRowButtonDescriptor|Stream.<ThreadRowButtonDescriptor>} buttonDescriptor - An options object for the button.
   * @return {void}
   */
  addButton: function(){},

  /**
   * Adds an attachment icon to the row.
   * @param {ThreadRowAttachmentIconDescriptor|Stream.<ThreadRowAttachmentIconDescriptor>} threadRowAttachmentIconDescriptor - The options for the icon to add.
   * @return {void}
   */
  addAttachmentIcon: function(){},

  /**
   * Replaces the text inside the date column.
   * @param {ThreadRowDateDescriptor|Stream.<ThreadRowDateDescriptor>} threadRowDateDescriptor - The options for the date replacement.
   * @return {void}
   */
  replaceDate: function(){},

  /**
   * If this row represents a draft, then this allows the word "Draft" and the number next to it
   * to be replaced.
   * @param {ThreadRowDraftLabelDescriptor|Stream.<ThreadRowDraftLabelDescriptor>} draftLabelDescriptor - The options for the replacement.
    * @return {void}
   */
  replaceDraftLabel: function(){},

  /**
  * Gets the subject of this thread.
  * @return {string} The subject.
  */
  getSubject: function(){},

  /**
  * Gets string representation of the timestamp of the most recent message on the thread.
  * Note: this is the string representation because timezone information is not available,
  * the accuracy is limited to minutes, and it is formatted to the user's language.
  * @return {string} The date as a string.
  */
  getDateString: function(){},

  /**
   * Gets the Gmail Thread ID of the thread.
   * @return {string} The gmail threadID.
   */
  getThreadID: function(){},

  /**
  * Gets the Gmail Thread ID of the thread only if the thread ID is stable. Some threads
  * such as those with only a single Draft message in them will occasionally change their
  * thread ID. If you're using the thread ID as a key, you may experiemnce unexpected behaviour
  * if you're not careful about this fact. This method provides you with an easy way to tell if
  * the thread has a stable ID. It will only return a thread ID if it is expected to stay the same.
  * @return {string} The gmail threadID or null if its not stable.
  */
  getThreadIDIfStable: function(){},

  /**
   * Returns a Promise for the thread row's draft ID, if the thread row
   * represents a single draft. Otherwise the promise may resolve to null.
   * @return {Promise.<string>}
   */
  getDraftID: function() {},

  /**
  * Gets the number of visible draft messages in the row. This is purely an estimate based on
  * what is visible in the row.
  * @return {number}
  */
  getVisibleDraftCount: function(){},

  /**
  * Gets the number of visible messages in the thread based on the visible numeric marker.
  * @return {number}
  */
  getVisibleMessageCount: function(){},

  /**
  * Gets the <b>visible</b> contacts listed on the row. Note: this may noit include all
  * participants on the thread as this information is not visible.
  * @return {Contact[]} the visible contact objects
  */
  getContacts: function(){},

  /**
   * This property is set to true once the view is destroyed.
   * @type {boolean}
   */
  destroyed: false,

  /**
   * Fires when the thread row is no longer visible.
   * @event ThreadRowView#destroy
   */

};

/**
* @class
* This type is used to describe labels that you add to {ThreadRowView} and {CollapsibleSectionView}.
*/
var LabelDescriptor = /** @lends LabelDescriptor */{

  /**
  * Text of the label.
  * @type {string}
  */
  title:null,

  /**
  * The text color of the label.
  * ^optional
  * @type {string}
  */
  foregroundColor:null,

  /**
  * The background color of the label.
  * ^optional
  * @type {string}
  */
  backgroundColor:null,

  /**
  * URL for the icon to show on the label. Should be a local extension file URL or a HTTPS URL.
  * @type {string}
  */
  iconUrl:null,

  /**
  * A CSS class to apply to the icon.
  * ^optional
  * ^default=MODIFIER
  * @type {string}
  */
  iconClass:null
};


/**
* @class
* This type is used to describe images that you add to {ThreadRowView}.
*/
var ImageDescriptor = /** @lends ImageDescriptor */{

  /**
  * URL for the image to show on the row. Should be a local extension file URL or a HTTPS URL.
  * @type {string}
  */
  imageUrl:null,

  /**
  * A CSS class to apply to the image.
  * ^optional
  * ^default=null
  * @type {string}
  */
  imageClass: null,

  /**
  * The tooltip text to show when the user hovers over the image.
  * ^optional
  * ^default=null
  * @type {string}
  */
  tooltip:null,

  /**
   * If multiple images from your app are added then they will be ordered by this value,
   * ^optional
   * ^default=0
   * @type {number}
   */
  orderHint:null
};


/**
* @class
* This type is used to describe a button you add to a {ThreadRowView}.
*/
var ThreadRowButtonDescriptor = /** @lends ThreadRowButtonDescriptor */{

  /**
  * URL for the icon to show on the button. Should be a local extension file URL or a HTTPS URL.
  * @type {string}
  */
  iconUrl:null,

  /**
  * A CSS class to apply to the icon button.
  * ^optional
  * ^default=MODIFIER
  * @type {string}
  */
  iconClass:null,

  /**
  * A handler that gets called when the button is clicked on. The event object contains a
  * {threadRowView} property and optionally a {dropdown} property if
  * the {hasDropdown} was set to {true}.
  * @type {func(event)}
  */
  onClick:null,

  /**
  * If true, the button will open a dropdown menu above it, and the event object will have a {dropdown} property of type {DropdownView} that
  * allows the dropdown to be customized when opened.
  * ^optional
  * ^default=false
  * @type {boolean}
  */
  hasDropdown:null
};


/**
* @class
* This type is used to describe an icon you add to a {ThreadRowView}.
*/
var ThreadRowAttachmentIconDescriptor = /** @lends ThreadRowAttachmentIconDescriptor */{

  /**
  * URL for the icon to show on in the attachments column. Should be a local extension file URL or a HTTPS URL.
  * ^optional
  * @type {string}
  */
  iconUrl:null,

  /**
  * A CSS class to apply to the icon.
  * ^optional
  * ^default=MODIFIER
  * @type {string}
  */
  iconClass:null,

  /**
  * The tooltip text to show when the user hovers over the icon.
  * ^optional
  * @type {string}
  */
  tooltip:null
};


/**
* @class
* This type is used to modify {ThreadRowView}'s which represent drafts.
*/
var ThreadRowDateDescriptor = /** @lends ThreadRowDateDescriptor */{

  /**
  * The date text to replace with.
  * @type {string}
  */
  text:null,

  /**
  * The text color of the replaced date text.
  * ^optional
  * @type {string}
  */
  textColor:null,

  /**
  * The tooltip text to show when the user hovers over the date.
  * ^optional
  * @type {string}
  */
  tooltip:null
};

/**
* @class
* This type is used to modification you can do to a {ThreadRowView}.
*/
var ThreadRowDraftLabelDescriptor = /** @lends ThreadRowDraftLabelDescriptor */{

  /**
  * The text to replace "Draft" with.
  * @type {string}
  */
  text:null,

  /**
  * The number to show in parentheses next to "Draft". No number will be shown
  * if this is 1.
  * ^optional
  * ^default=1
  * @type {string}
  */
  count:null
};
