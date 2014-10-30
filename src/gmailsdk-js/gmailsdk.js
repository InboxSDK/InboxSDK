require('./error-logging').setupGlobalLogger();
require('./interface').load();

var GmailSDK = {
  Email: require('./email'),
  ComposeManager: require('./compose-manager'),
  Mailbox: require('./mailbox'),
  Utils: {
    loadScript: require('../common/load-script'),
    logError: require('./log-error'),
    track: require('./track')
  }
};

// Place a bunch of poison-pill properties for things that aren't implemented.
function notImplemented() {throw new Error("Not implemented yet");}
var niSettings = {
  configurable: false, enumerable:false,
  get:notImplemented, set:notImplemented
};
Object.defineProperties(GmailSDK, {
  Views: niSettings,
  ButterBar: niSettings,
  ThreadViewManager: niSettings,
  Widgets: niSettings
});

module.exports = GmailSDK;
