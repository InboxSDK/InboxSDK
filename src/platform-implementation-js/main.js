if (!global.__InboxSDKImpLoader) {
  require('safari-fix-map');
  var RSVP = require('rsvp');
  var Kefir = require('kefir');

  var onready = new RSVP.Promise((resolve, reject) => {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      resolve();
    } else {
      resolve(
        Kefir.merge([
          Kefir.fromEvents(document, 'DOMContentLoaded'),
          Kefir.fromEvents(window, 'load')
        ]).take(1).map(() => null).toPromise(RSVP.Promise)
      );
    }
  });

  global.__InboxSDKImpLoader = {
    load: function(version, appId, opts) {
      if (version !== "0.1") {
        throw new Error("Unsupported InboxSDK version");
      }

      return onready.then(() => {
        const {makePlatformImplementation} = require('./platform-implementation');
        return makePlatformImplementation(appId, opts);
      });
    }
  };
}
