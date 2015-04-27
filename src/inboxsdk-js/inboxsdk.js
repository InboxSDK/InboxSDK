var _ = require('lodash');
var RSVP = require('rsvp');

var PlatformImplementationLoader = require('./loading/platform-implementation-loader');
var checkRequirements = require('./check-requirements');

/**
* @class
* The functions in this class are only used for load related functionality like loading the SDK itself or other external scripts.
*/
var InboxSDK = {
  LOADER_VERSION: process.env.VERSION
};

/**
* Loads the InboxSDK remotely and prepares it to be used.
* @function
* @param {string} version - the version of the SDK to load, the only acceptable value currently is "1"
* @param {string} appId - the AppId that you registered for on the <a href="/register">AppId Registration page</a> 
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
      console.error("Possibly uncaught promise rejection", err, err && err.stack);
    });
  }

  checkRequirements(opts);

  var platformImplementationLoader = new PlatformImplementationLoader(appId, opts);
  var loadPromise = platformImplementationLoader.load();
  loadPromise.catch(function(err) {
    console.error("Failed to load implementation:", err, err && err.stack);
  });
  return loadPromise;
};

/**
* Loads a remote script into this extensions content script space and evals it
* @function
* @param {string} url - the URL of the remote script to load.
* @return {Promise} a promise which resolves when this script is finished downloading and eval'ing
*/

InboxSDK.loadScript = require('../common/load-script');

module.exports = InboxSDK;
