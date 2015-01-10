var _ = require('lodash');
var RSVP = require('rsvp');

var PlatformImplementationLoader = require('./loading/platform-implementation-loader');
var checkRequirements = require('./check-requirements');

var Compose = require('./api-definitions/compose');
var Conversations = require('./api-definitions/conversations');
var Mailbox = require('./api-definitions/mailbox');
var NavMenu = require('./api-definitions/nav-menu');
var Sidebar = require('./api-definitions/sidebar');
var Tracker = require('./tracker');
var Toolbars = require('./api-definitions/toolbars');
var Modal = require('./api-definitions/modal');

/**
* @class
* The functions in this class are only used for load related functionality like loading the SDK itself or other external scripts.
*/
var InboxSDK = /*deprecated*/ function(appId, opts){
  if (!(this instanceof InboxSDK)) {
    throw new Error("new must be used");
  }
  console.warn("Deprecation warning: Use InboxSDK.load(...) instead.");
  opts = _.extend({
    // defaults
    globalErrorLogging: true
  }, opts, {
    // stuff that can't be overridden, such as extra stuff this file passes to
    // the implementation script.
    VERSION: InboxSDK.LOADER_VERSION
  });

  checkRequirements(opts);

  this._appId = appId;
  this._platformImplementationLoader = new PlatformImplementationLoader(this._appId, opts);
  this._tracker = new Tracker(this._platformImplementationLoader, opts);

  this.Compose = new Compose(this._platformImplementationLoader);
  this.Conversations = new Conversations(this._platformImplementationLoader);
  this.Router = new Router(this._platformImplementationLoader);
  this.FullscreenViews = this.Router; /* deprecated */
  this.Mailbox = new Mailbox(this._platformImplementationLoader);
  this.Modal = new Modal(this._platformImplementationLoader);
  this.NavMenu = new NavMenu(this._platformImplementationLoader);
  this.Sidebar = new Sidebar(this._platformImplementationLoader);
  this.Toolbars = new Toolbars(this._platformImplementationLoader);


  this.Util = {
    loadScript: require('../common/load-script'),
    logError: this._tracker.logError.bind(this._tracker),
    track: this._tracker.track.bind(this._tracker)
  };

  var self = this;
  this._platformImplementationLoader.load().then(function(Imp) {
    InboxSDK.IMPL_VERSION = InboxSDK.prototype.IMPL_VERSION = Imp.IMPL_VERSION;
  }).catch(function(err) {
    console.error("Failed to load implementation:", err);
  });
};

InboxSDK.LOADER_VERSION = process.env.VERSION;

/**
* Loads the InboxSDK remotely and prepares it to be used.
* @function
* @param {string} version - the version of the SDK to load, the only acceptable value currently is "1"
* @param {string} appId - the name of your app that was given to you by the InboxSDK team
* @return {Promise} a promise which resolves when the SDK is loaded and ready to be used
*/
InboxSDK.load = function(version, appId, opts){
  opts = _.extend({
    // defaults
    globalErrorLogging: true
  }, opts, {
    // stuff that can't be overridden, such as extra stuff this file passes to
    // the implementation script.
    VERSION: InboxSDK.LOADER_VERSION,
    REQUESTED_API_VERSION: version
  });

  if (!RSVP._errorHandlerSetup) {
    RSVP._errorHandlerSetup = true;
    RSVP.on('error', function(err) {
      console.error("Possibly uncaught promise rejection", err);
    });
  }

  checkRequirements(opts);

  var platformImplementationLoader = new PlatformImplementationLoader(appId, opts);
  var loadPromise = platformImplementationLoader.load();
  loadPromise.catch(function(err) {
    console.error("Failed to load implementation:", err);
  });
  return loadPromise;
};

/**
* Loads the a remote script into this extensions content script space and evals it
* @function
* @param {string} url - the URL of the remote script to load.
* @return {Promise} a promise which resolves when this script is finished downloading and eval'ing
*/

InboxSDK.loadScript = require('../common/load-script');

module.exports = InboxSDK;
