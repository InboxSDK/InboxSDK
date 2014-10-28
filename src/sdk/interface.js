var RSVP = require('rsvp');
var _ = require('lodash');
var loadScript = require('../lib/loadScript');

var Mailbox = require('./mailbox');

function loadImpFile() {
  if (global.__GmailSDKImpLoader) {
    return RSVP.resolve();
  } else {
    return loadScript('http://localhost:4567/gmailsdk-imp.js').then(function() {
      if (!global.__GmailSDKImpLoader) {
        throw new Error("Implementation file did not load correctly");
      }
    });
  }
}

var Interface = {
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
