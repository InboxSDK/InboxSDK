var _ = require('lodash');
var PlatformImplementationLoader = require('./loading/platform-implementation-loader');

var checkRequirements = require('./check-requirements');
var Compose = require('./api-definitions/compose');
var Conversations = require('./api-definitions/conversations');
var Mailbox = require('./api-definitions/mailbox');
var Sidebar = require('./api-definitions/sidebar');
var Tracker = require('./tracker');
var FullscreenViews = require('./api-definitions/fullscreen-views');
var Toolbars = require('./api-definitions/toolbars');
var Modal = require('./api-definitions/modal');

var InboxSDK = function(appId, opts){
  if (!(this instanceof InboxSDK)) {
    throw new Error("new must be used");
  }
  this.VERSION = process.env.VERSION;
  this.IMPL_VERSION = null;
  opts = _.extend({
    // defaults
    globalErrorLogging: true
  }, opts, {
    // stuff that can't be overridden, such as extra stuff this file passes to
    // the implementation script.
    VERSION: this.VERSION
  });

  checkRequirements(opts);

  this._appId = appId;
  this._platformImplementationLoader = new PlatformImplementationLoader(this._appId, opts);
  this._tracker = new Tracker(this._platformImplementationLoader, opts);

  this.Compose = new Compose(this._platformImplementationLoader);
  this.Conversations = new Conversations(this._platformImplementationLoader);
  this.FullscreenViews = new FullscreenViews(this._platformImplementationLoader);
  this.Mailbox = new Mailbox(this._platformImplementationLoader);
  this.Modal = new Modal(this._platformImplementationLoader);
  this.Sidebar = new Sidebar(this._platformImplementationLoader);
  this.Toolbars = new Toolbars(this._platformImplementationLoader);


  this.Util = {
    loadScript: require('../common/load-script'),
    logError: this._tracker.logError.bind(this._tracker),
    track: this._tracker.track.bind(this._tracker)
  };

  var self = this;
  this._platformImplementationLoader.load().then(function(Imp) {
    self.IMPL_VERSION = Imp.VERSION;
  }).catch(function(err) {
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
  ButterBar: niSettings
});

module.exports = InboxSDK;
