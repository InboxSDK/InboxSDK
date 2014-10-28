if (global.__GmailSDKImpLoader) {
  return;
}

global.__GmailSDKImpLoader = {
  load: function(version) {
    if (version !== "0.1") {
      throw new Error("Unsupported GmailSDK version");
    }
    return require('./gmailsdk-imp');
  }
};
