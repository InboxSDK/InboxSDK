if (!global.__InboxSDKImpLoader) {
  require('safari-fix-map');

  global.__InboxSDKImpLoader = {
    load: function(version, appId, opts) {
      if (version !== "0.1") {
        throw new Error("Unsupported InboxSDK version");
      }

    	const makePlatformImplementation = require('./platform-implementation');
    	return makePlatformImplementation(appId, opts);
    }
  };
}
