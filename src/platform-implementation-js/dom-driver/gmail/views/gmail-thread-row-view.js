var _ = require('lodash');
var Bacon = require('baconjs');

var ThreadRowViewDriver = require('../../../driver-interfaces/thread-row-view-driver');

var GmailThreadRowView = function(element) {
  ThreadRowViewDriver.call(this);

  this._eventStreamBus = new Bacon.Bus();
  this._element = element;

  console.log('GmailThreadRowView constructed', element);
};

GmailThreadRowView.prototype = Object.create(ThreadRowViewDriver.prototype);

_.extend(GmailThreadRowView.prototype, {

  __memberVariables: [
    {name: '_element', destroy: false},
    {name: '_eventStreamBus', destroy: true, destroyFunction: 'end'}
  ],

  addLabel: function(label) {
    console.log('addLabel unimplemented');
  },

  addButton: function(buttonDescriptor) {
    console.log('addButton unimplemented');
  },

  addAttachmentIcon: function(url) {
    console.log('addAttachmentIcon unimplemented');
  }

});

module.exports = GmailThreadRowView;
