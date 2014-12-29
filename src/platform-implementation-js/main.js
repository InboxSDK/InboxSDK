if (!global.__InboxSDKImpLoader) {
  global.__InboxSDKImpLoader = {
    load: function(version, appId, opts) {
      if (version !== "0.1") {
        throw new Error("Unsupported InboxSDK version");
      }

      var PlatformImp = require('./platform-implementation');
      return new PlatformImp(appId, opts);
    }
  };
}
