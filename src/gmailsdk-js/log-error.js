module.exports = function(platformImplementationLoader) {
  function reporter() {
    var args = arguments;
    return platformImplementationLoader.load().then(function(Imp) {
      Imp.Utils.logErrorToServer.apply(Imp.Utils, args);
    });
  }

  var logError = require('../common/log-error-factory')(reporter);
  return logError;
};
