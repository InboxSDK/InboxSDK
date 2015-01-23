var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;

/**
* @class
* Object that represents a visible thread row view in a list of rows
*/
var ThreadRowView = function(threadRowViewDriver){
  EventEmitter.call(this);

  this._threadRowViewDriver = threadRowViewDriver;
  this._threadRowViewDriver.getEventStream().onEnd(this, 'emit', 'destroy');
  this._threadRowViewDriver.setUserView(this);
};

ThreadRowView.prototype = Object.create(EventEmitter.prototype);

_.extend(ThreadRowView.prototype, /** @lends ThreadRowView */ {

  /**
   * Adds a label to the thread row view
   * @param {LabelDescriptor} labelDescriptor - an options object for the label
   * @return {void}
   */
  addLabel: function(labelDescriptor) {
    this._threadRowViewDriver.addLabel(labelDescriptor);
  },

  /**
   * Adds an icon style button to this row, placed right next to the star button
   * @param {ThreadRowButtonDescriptor} buttonDescriptor - an options object for the button
   * @return {void}
   */
  addButton: function(buttonDescriptor) {
    this._threadRowViewDriver.addButton(buttonDescriptor);
  },

  /**
   * Adds an attachment icon to the row
   * @param {ThreadRowAttachmentIconDescriptor} ThreadRowAttachmentIconDescriptor - the options for the icon to add
   */
  addAttachmentIcon: function(threadRowAttachmentIconDescriptor) {
    this._threadRowViewDriver.addAttachmentIcon(ThreadRowAttachmentIconDescriptor);
  },

  /**
   * Replaces the text inside the date column
   * @param {ThreadRowDateDescriptor} threadRowDateDescriptor - the options for the date replacement
   * @return {void}
   */
  replaceDate: function(threadRowDateDescriptor) {
    this._threadRowViewDriver.replaceDate(threadRowDateDescriptor);
  },

  /**
  * Gets the subject of this thread
  * @return {string} the subject
  */
  getSubject: function() {
    return this._threadRowViewDriver.getSubject();
  },

  /**
  * Gets string representation of the timestamp of the most recent message on the thread.
  * Note: this is the string representation because timezone information is not available
  * and the accuracy is limited to minutes
  * @return {string} the date as a string
  */
  getDateString: function() {
    return this._threadRowViewDriver.getDateString();
  },

  /**
   * Gets the Gmail Thread ID of the thread
   * @return {string} the gmail threadID
   */
  getThreadID: function() {
    return this._threadRowViewDriver.getThreadID();
  },

  /**
  * Gets the Gmail Thread ID of the thread only if the thread ID is expected to stay the
  * same. Returns null otherwise. It would return null if the thread row is only a draft
  * that isn't threaded with any messages.
  * @return {string} the gmail threadID
  */
  getThreadIDIfStable: function() {
    if (this.getVisibleMessageCount() > 0) {
      return this.getThreadID();
    } else {
      return null;
    }
  },

  getVisibleDraftCount: function() {
    return this._threadRowViewDriver.getVisibleDraftCount();
  },

  getVisibleMessageCount: function() {
    return this._threadRowViewDriver.getVisibleMessageCount();
  },

  /**
  * Gets the <b>visible</b> contacts listed on the row. Note: this may noit include all
  * participants on the thread as this information is not visible
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
* This type is used to describe labels that you add to <code>ThreadRowView</code> and <code>CollapsibleSectionView</code>
*/
var LabelDescriptor = /** @lends LabelDescriptor */{

  /**
  * Text of the label
  * @type {string}
  */
  title:null,

  /**
  * The text color of the label
  * @type {string}
  */
  foregroundColor:null,

  /**
  * The background color of the label
  * @type {string}
  */
  backgroundColor:null,

  /**
  * URL for the icon to show on the label. Should be a local extension file URL or a HTTPS URL.
  * @type {string}
  */
  iconUrl:null,

  /**
  * A CSS class to apply to the icon
  * ^optional
  * ^default=MODIFIER
  * @type {string}
  */
  iconClass:null
};


/**
* @class
* This type is used to describe a button you add to a <code>ThreadRowView</code>
*/
var ThreadRowButtonDescriptor = /** @lends ThreadRowButtonDescriptor */{

  /**
  * URL for the icon to show on the button. Should be a local extension file URL or a HTTPS URL.
  * @type {string}
  */
  iconUrl:null,

  /**
  * A CSS class to apply to the icon button
  * ^optional
  * ^default=MODIFIER
  * @type {string}
  */
  iconClass:null,

  /**
  * A handler that gets called when the button is clicked on. The event object contains a
  * <code>threadRowView</code> property and optionally a <code>dropdown</code> property if
  * the <code>hasDropdown</code> was set to <code>true</code>
  * @type {function(event)}
  */
  onClick:null,

  /**
  * Whether this button should open a dropdown when clicked
  * @type {boolean}
  */
  hasDropdown:null
};


/**
* @class
* This type is used to describe a button you add to a <code>ThreadRowView</code>
*/
var ThreadRowAttachmentIconDescriptor = /** @lends ThreadRowAttachmentIconDescriptor */{

  /**
  * URL for the icon to show on in the attachments column. Should be a local extension file URL or a HTTPS URL.
  * @type {string}
  */
  iconUrl:null,

  /**
  * The tooltip text to show when the user hovers over the icon
  * @type {string}
  */
  tooltip:null
};


/**
* @class
* This type is used to describe a button you add to a <code>ThreadRowView</code>
*/
var ThreadRowDateDescriptor = /** @lends ThreadRowDateDescriptor */{

  /**
  * The date text to replace with
  * @type {string}
  */
  text:null,

  /**
  * The text color of the replaced date text
  * @type {string}
  */
  textColor:null,

  /**
  * The tooltip text to show when the user hovers over the date
  * @type {string}
  */
  tooltip:null
};







module.exports = ThreadRowView;
