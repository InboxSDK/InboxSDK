var GmailSDKImp = {
  ComposeManager: require('./compose-manager'),
  Utils: {
    logErrorToServer: require('./log-error-to-server'),
    track: require('./track')
  }
};

module.exports = GmailSDKImp;
