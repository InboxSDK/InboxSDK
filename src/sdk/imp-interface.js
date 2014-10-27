var _ = require('lodash');
var loadScript = require('../lib/loadScript');

module.exports.load = function(GmailSDK) {
  setTimeout(function() {
    GmailSDK.Email.getUser = require('../imp/main').getUser;
    setInterval(function() {
      GmailSDK.Mailbox.emit('example', {hello: _.constant(Math.random())});
    }, 2000);
  }, 1000);
};
