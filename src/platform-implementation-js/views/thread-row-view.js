var _ = require('lodash');
var EventEmitter = require('../lib/safe-event-emitter');

/**
* @class
* Object that represents a visible thread row view in a list of rows
*/
var ThreadRowView = function(threadRowViewDriver){
  EventEmitter.call(this);

  this._threadRowViewDriver = threadRowViewDriver;
  this._threadRowViewDriver.getEventStream().onEnd(() => this.emit('destroy'));
  this._threadRowViewDriver.setUserView(this);
};

ThreadRowView.prototype = Object.create(EventEmitter.prototype);

_.extend(ThreadRowView.prototype, /** @lends ThreadRowView */ {

  /**
   * Adds a label to the thread row view.
   * @param {LabelDescriptor} labelDescriptor - An options object for the label.
   * @return {void}
   */
  addLabel: function(labelDescriptor) {
    this._threadRowViewDriver.addLabel(labelDescriptor);
  },

  /**
   * Adds an image to the thread row view.
   * @param {ImageDescriptor} imageDescriptor - An options object for the image.
   * @return {void}
   */
  addImage: function(imageDescriptor){
    this._threadRowViewDriver.addImage(imageDescriptor);
  },

  /**
   * Adds an icon style button to this row, placed right next to the star button.
   * @param {ThreadRowButtonDescriptor} buttonDescriptor - An options object for the button.
   * @return {void}
   */
  addButton: function(buttonDescriptor) {
    this._threadRowViewDriver.addButton(buttonDescriptor);
  },

  /**
   * Adds an attachment icon to the row.
   * @param {ThreadRowAttachmentIconDescriptor} threadRowAttachmentIconDescriptor - The options for the icon to add.
   * @return {void}
   */
  addAttachmentIcon: function(threadRowAttachmentIconDescriptor) {
    this._threadRowViewDriver.addAttachmentIcon(threadRowAttachmentIconDescriptor);
  },

  /**
   * Replaces the text inside the date column.
   * @param {ThreadRowDateDescriptor} threadRowDateDescriptor - The options for the date replacement.
   * @return {void}
   */
  replaceDate: function(threadRowDateDescriptor) {
    this._threadRowViewDriver.replaceDate(threadRowDateDescriptor);
  },

  replaceDraftLabel: function(draftLabelDescriptor) {
    this._threadRowViewDriver.replaceDraftLabel(draftLabelDescriptor);
  },

  /**
  * Gets the subject of this thread.
  * @return {string} The subject.
  */
  getSubject: function() {
    return this._threadRowViewDriver.getSubject();
  },

  /**
  * Gets string representation of the timestamp of the most recent message on the thread.
  * Note: this is the string representation because timezone information is not available
  * and the accuracy is limited to minutes.
  * @return {string} The date as a string.
  */
  getDateString: function() {
    return this._threadRowViewDriver.getDateString();
  },

  /**
   * Gets the Gmail Thread ID of the thread.
   * @return {string} The gmail threadID.
   */
  getThreadID: function() {
    return this._threadRowViewDriver.getThreadID();
  },

  /**
  * Gets the Gmail Thread ID of the thread only if the thread ID is stable. Some threads
  * such as those with only a signle Draft message in them will occasionally change their
  * thread ID. If you're using the thread ID as a key, you may experiemnce unexpected behaviour
  * if you're not careful about this fact. This method provides you with an easy way to tell if
  * the thread has a stable ID. It will only return a thread ID if it is expected to stay the same.
  * @return {string} The gmail threadID or null if its not stable.
  */
  getThreadIDIfStable: function() {
    if (this.getVisibleMessageCount() > 0) {
      return this.getThreadID();
    } else {
      return null;
    }
  },

  /**
  * Gets the number of visible draft messages in the row. This is purely an estimate based on
  * what is visible in the row.
  * @return {number}
  */
  getVisibleDraftCount: function() {
    return this._threadRowViewDriver.getVisibleDraftCount();
  },

  /**
  * Gets the number of visible messages in the thread based on the visible numeric marker.
  * @return {number}
  */
  getVisibleMessageCount: function() {
    return this._threadRowViewDriver.getVisibleMessageCount();
  },

  /**
  * Gets the <b>visible</b> contacts listed on the row. Note: this may noit include all
  * participants on the thread as this information is not visible.
  * @return {Contact[]} the visible contact objects
  */
  getContacts: function(){
    return this._threadRowViewDriver.getContacts();
  }

  /**
   * Fires when the thread row is no longer visible.
   * @event ThreadRowView#destroy
   */

});

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
  * @type {string}
  */
  foregroundColor:null,

  /**
  * The background color of the label.
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
  * @type {string}
  */
  tooltip:null
};


/**
* @class
* This type is used to modification you can do to a {ThreadRowView}.
*/
var ThreadRowDateDescriptor = /** @lends ThreadRowDateDescriptor */{

  /**
  * The date text to replace with.
  * @type {string}
  */
  text:null,

  /**
  * The text color of the replaced date text.
  * @type {string}
  */
  textColor:null,

  /**
  * The tooltip text to show when the user hovers over the date.
  * @type {string}
  */
  tooltip:null
};



module.exports = ThreadRowView;
