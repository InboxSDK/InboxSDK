require('./error-logging').setup();

var GmailSDKImp = {
  ComposeManager: require('./compose-manager'),
  Email: require('./email'),
  Utils: {
    logErrorToServer: require('./log-error-to-server'),
    track: require('./track')
  }
};

module.exports = GmailSDKImp;
