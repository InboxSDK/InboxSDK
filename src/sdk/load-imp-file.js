var RSVP = require('rsvp');
var loadScript = require('../lib/loadScript');

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

module.exports = loadImpFile;
