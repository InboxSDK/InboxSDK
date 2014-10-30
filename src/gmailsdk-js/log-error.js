function reporter() {
  var args = arguments;
  return require('./interface').load().then(function(Imp) {
    Imp.Utils.logErrorToServer.apply(Imp.Utils, args);
  });
}

var logError = require('../common/log-error-factory')(reporter);

module.exports = logError;
