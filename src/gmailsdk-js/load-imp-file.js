var RSVP = require('rsvp');
var loadScript = require('../common/load-script');

function loadImpFile() {
  if (global.__GmailSDKImpLoader) {
    return RSVP.resolve();
  } else {
    return loadScript('http://localhost:4567/platform-implementation.js').then(function() {
      if (!global.__GmailSDKImpLoader) {
        throw new Error("Implementation file did not load correctly");
      }
    });
  }
}

module.exports = loadImpFile;
