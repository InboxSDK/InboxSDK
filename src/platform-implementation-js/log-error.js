var logErrorToServer = require('./log-error-to-server');
var logError = require('../common/log-error-factory')(logErrorToServer);

module.exports = logError;
