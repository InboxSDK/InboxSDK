require('./error-logging').setupGlobalLogger();

var PlatformImplementationLoader = require('./loading/platform-implementation-loader');

var AttachmentCardManager = require('./api-definitions/attachment-card-manager');
var Email = require('./api-definitions/email');
var ComposeManager = require('./api-definitions/compose-manager');
var Mailbox = require('./api-definitions/mailbox');
var MessageManager = require('./api-definitions/message-manager');


var GmailSDK = function(appId){
  this._appId = appId;
  this._platformImplementationLoader =  new PlatformImplementationLoader(this._appId);

  this.AttachmentCardManager = new AttachmentCardManager(this._platformImplementationLoader);
  this.ComposeManager = new ComposeManager(this._platformImplementationLoader);
  this.Email = new Email(this._platformImplementationLoader);
  this.Mailbox = new Mailbox(this._platformImplementationLoader);
  this.MessageManager = new MessageManager(this._platformImplementationLoader);

  this.Util = {
    loadScript: require('../common/load-script')
    /* logError: require('./log-error'),
    track: require('./track') */
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
Object.defineProperties(GmailSDK.prototype, {
  Views: niSettings,
  ButterBar: niSettings,
  ThreadViewManager: niSettings,
  Widgets: niSettings
});

module.exports = GmailSDK;
