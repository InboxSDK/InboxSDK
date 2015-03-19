if (!global.__InboxSDKImpLoader) {
  require('safari-fix-map');

  global.__InboxSDKImpLoader = {
    load: function(version, appId, opts) {
      if (version !== "0.1") {
        throw new Error("Unsupported InboxSDK version");
      }

      if(_isOnInbox()){
      	return new Promise(function(resolve, reject){
      		//never resolve
      	});
      }
      else{
      	const makePlatformImplementation = require('./platform-implementation');
      	return makePlatformImplementation(appId, opts);
      }
    }
  };
}

function _isOnInbox(){
  const origin = window.location && window.location.origin;
	return origin && origin.match(/^https?:\/\/inbox\.google\.com$/);
}
