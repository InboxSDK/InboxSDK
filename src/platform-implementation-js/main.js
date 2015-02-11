if (!global.__InboxSDKImpLoader) {
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
      	var PlatformImp = require('./platform-implementation');
      	return new PlatformImp(appId, opts);
      }
    }
  };
}

function _isOnInbox(){
	return !location.href || location.href.indexOf('//inbox.google') > -1;
}
