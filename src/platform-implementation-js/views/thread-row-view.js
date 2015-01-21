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
   * Adds an attachment icon
   */
  addAttachmentIcon: function(opts) {
    this._threadRowViewDriver.addAttachmentIcon(opts);
  },

  /**
   * Replaces the text inside the date column
   */
  replaceDate: function(opts) {
    this._threadRowViewDriver.replaceDate(opts);
  },

  getSubject: function() {
    return this._threadRowViewDriver.getSubject();
  },

  getDateString: function() {
    return this._threadRowViewDriver.getDateString();
  },

  /**
   * Gets the Gmail Thread Id
   */
  getThreadID: function() {
    return this._threadRowViewDriver.getThreadID();
  },

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

module.exports = ThreadRowView;
