var assign = require('lodash/object/assign');
var logError = require('../common/log-error');

var PlatformImplementationLoader = require('./loading/platform-implementation-loader');
var checkRequirements = require('./check-requirements');
var BUILD_VERSION = require('../common/version').BUILD_VERSION;

var InboxSDK = {
  LOADER_VERSION: BUILD_VERSION
};

InboxSDK.load = function(version, appId, opts){
  opts = assign({
    // defaults
    globalErrorLogging: true
  }, opts, {
    // stuff that can't be overridden, such as extra stuff this file passes to
    // the implementation script.
    VERSION: InboxSDK.LOADER_VERSION,
    REQUESTED_API_VERSION: version
  });

  checkRequirements(opts);

  return PlatformImplementationLoader.load(appId, opts);
};

InboxSDK.loadScript = require('../common/load-script');

if (['https://mail.google.com', 'https://inbox.google.com'].indexOf(document.location.origin) != -1) {
  PlatformImplementationLoader.preload();
}

module.exports = InboxSDK;
