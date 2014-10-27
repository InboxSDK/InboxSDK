require('./error-logging');

var EventEmitter = require('events').EventEmitter;

var GmailSDK = {
  Email: {
    getUser: function() {
      throw new Error("GmailSDK not loaded yet");
    }
  },
  Mailbox: new EventEmitter(),
  hello: console.log.bind(console, "gmail sdk says hello"),
  loadScript: require('../lib/loadScript')
};

require('./imp-interface').load(GmailSDK);

module.exports = GmailSDK;
