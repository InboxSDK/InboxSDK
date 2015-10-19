var _ = require('lodash');
var EventEmitter = require('../lib/safe-event-emitter');

// documented in src/docs/
var ThreadRowView = function(threadRowViewDriver){
  EventEmitter.call(this);

  this._threadRowViewDriver = threadRowViewDriver;
  this._threadRowViewDriver.getEventStream().onEnd(() => this.emit('destroy'));
  this._threadRowViewDriver.setUserView(this);
};

ThreadRowView.prototype = Object.create(EventEmitter.prototype);

_.extend(ThreadRowView.prototype, {

  addLabel: function(labelDescriptor) {
    this._threadRowViewDriver.addLabel(labelDescriptor);
  },

  addImage: function(imageDescriptor){
    this._threadRowViewDriver.addImage(imageDescriptor);
  },

  addButton: function(buttonDescriptor) {
    this._threadRowViewDriver.addButton(buttonDescriptor);
  },

  addAttachmentIcon: function(threadRowAttachmentIconDescriptor) {
    this._threadRowViewDriver.addAttachmentIcon(threadRowAttachmentIconDescriptor);
  },

  replaceDate: function(threadRowDateDescriptor) {
    this._threadRowViewDriver.replaceDate(threadRowDateDescriptor);
  },

  replaceDraftLabel: function(draftLabelDescriptor) {
    this._threadRowViewDriver.replaceDraftLabel(draftLabelDescriptor);
  },

  getSubject: function() {
    return this._threadRowViewDriver.getSubject();
  },

  getDateString: function() {
    return this._threadRowViewDriver.getDateString();
  },

  getThreadID: function() {
    return this._threadRowViewDriver.getThreadID();
  },

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

  getContacts: function(){
    return this._threadRowViewDriver.getContacts();
  }
});

module.exports = ThreadRowView;
