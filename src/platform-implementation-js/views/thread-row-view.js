var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;

/**
* @class
* Object that represents a visible thread row view in a list of threads
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
   * Adds a label
   */
  addLabel: function(labelDescriptor) {
    this._threadRowViewDriver.addLabel(labelDescriptor);
  },

  /**
   * Adds a button
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

module.exports = ThreadRowView;
