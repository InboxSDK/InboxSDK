if (!global.__GmailSDKImpLoader) {
  global.__GmailSDKImpLoader = {
    load: function(version, appId) {
      if (version !== "0.1") {
        throw new Error("Unsupported GmailSDK version");
      }

      var PlatformImp = require('./platform-imp');
      return new PlatformImp(appId);
    }
  };
}
