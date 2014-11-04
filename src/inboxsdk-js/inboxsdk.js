var PlatformImplementationLoader = require('./loading/platform-implementation-loader');
var Views = require('./api-definitions/views');
var Mailbox = require('./api-definitions/mailbox');
var Tracker = require('./tracker');

var InboxSDK = function(appId, opts){
  if (!(this instanceof InboxSDK)) {
    throw new Error("new must be used");
  }

  this._appId = appId;
  this._platformImplementationLoader = new PlatformImplementationLoader(this._appId);
  this._tracker = new Tracker(this._platformImplementationLoader);
  if (!opts || !opts.noGlobalErrorLogging) {
    this._tracker.setupGlobalLogger();
  }

  this.Views = new Views(this._platformImplementationLoader);
  this.Mailbox = new Mailbox(this._platformImplementationLoader);


  this.Util = {
    loadScript: require('../common/load-script'),
    logError: this._tracker.logError.bind(this._tracker),
    track: this._tracker.track.bind(this._tracker)
  };

  this._platformImplementationLoader.load().catch(function(err) {
    console.error("Failed to load implementation:", err);
  });
};

// Place a bunch of poison-pill properties for things that aren't implemented.
function notImplemented() {throw new Error("Not implemented yet");}
var niSettings = {
  configurable: false, enumerable:false,
  get:notImplemented, set:notImplemented
};
Object.defineProperties(InboxSDK.prototype, {
  ButterBar: niSettings,
  Widgets: niSettings
});

module.exports = InboxSDK;
