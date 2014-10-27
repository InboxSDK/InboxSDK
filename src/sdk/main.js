require('./error-logging');

alert('in main.js');

var GmailSDK = {
  hello: console.log.bind(console, "gmail sdk says hello"),
  loadScript: require('../lib/loadScript')
};

module.exports = GmailSDK;
