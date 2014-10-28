var RSVP = require('rsvp');
var _ = require('lodash');
var Mailbox = require('./mailbox');
var loadImpFile = require('./load-imp-file');

var Interface = {
  _overrideLoadImpFileFn: function(fn) {
    loadImpFile = fn;
  },
  load: _.once(function() {
    return loadImpFile().then(function() {
      return global.__GmailSDKImpLoader.load("0.1");
    }).then(function(Imp) {
      Interface.Imp = Imp;
      Mailbox.emit('example', 'implementation loaded');
      return Imp;
    });
  }),
  Imp: null
};

module.exports = Interface;
