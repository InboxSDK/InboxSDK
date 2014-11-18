var PlatformImplementationLoader = require('./loading/platform-implementation-loader');

var Compose = require('./api-definitions/compose');
var Conversations = require('./api-definitions/conversations');
var Mailbox = require('./api-definitions/mailbox');
var Tracker = require('./tracker');
var FullscreenViews = require('./api-definitions/fullscreen-views');
var Toolbars = require('./api-definitions/toolbars');
var Modal = require('./api-definitions/modal');

var InboxSDK = function(appId, opts){
  if (!(this instanceof InboxSDK)) {
    throw new Error("new must be used");
  }

  this._appId = appId;
  this._platformImplementationLoader = new PlatformImplementationLoader(this._appId, opts);
  this._tracker = new Tracker(this._platformImplementationLoader);
  if (!opts || !opts.noGlobalErrorLogging) {
    this._tracker.setupGlobalLogger();
  }

  this.Compose = new Compose(this._platformImplementationLoader);
  this.Conversations = new Conversations(this._platformImplementationLoader);
  this.FullscreenViews = new FullscreenViews(this._platformImplementationLoader);
  this.Mailbox = new Mailbox(this._platformImplementationLoader);
  this.Modal = new Modal(this._platformImplementationLoader);
  this.Toolbars = new Toolbars(this._platformImplementationLoader);


  this.Util = {
    loadScript: require('../common/load-script'),
    logError: this._tracker.logError.bind(this._tracker),
    track: this._tracker.track.bind(this._tracker)
  };

  this._platformImplementationLoader.load().catch(function(err) {
    console.error("Failed to load implementation:", err);
  });
};

InboxSDK.prototype.ready = function(){
  return this._platformImplementationLoader.load().then(function(Imp) {
    // Don't give the user a reference to the implementation object.
    return undefined;
  });
};

// Place a bunch of poison-pill properties for things that aren't implemented.
function notImplemented() {throw new Error("Not implemented yet");}
var niSettings = {
  configurable: false, enumerable:false,
  get:notImplemented, set:notImplemented
};
Object.defineProperties(InboxSDK.prototype, {
  ButterBar: niSettings
});

module.exports = InboxSDK;
