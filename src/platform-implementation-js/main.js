if (!global.__InboxSDKImpLoader) {
  var piMainStarted = Date.now();
  var oldDefine;
  try {
    if (typeof define !== "undefined" && define && define.amd) {
      // work around amd compatibility issue
      // https://groups.google.com/forum/#!msg/inboxsdk/U_bq82Exmwc/I3iIinxxCAAJ
      oldDefine = define;
      define = null;
    }
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

        var piLoadStarted = Date.now();
        return onready.then(() => {
          var oldDefine;
          try {
            if (typeof define !== "undefined" && define && define.amd) {
              // work around amd compatibility issue
              // https://groups.google.com/forum/#!msg/inboxsdk/U_bq82Exmwc/I3iIinxxCAAJ
              oldDefine = define;
              define = null;
            }
            const {makePlatformImplementation} = require('./platform-implementation');
            return makePlatformImplementation(appId, opts, {
              piMainStarted, piLoadStarted
            });
          } finally {
            if (oldDefine) {
              define = oldDefine;
            }
          }
        });
      }
    };
  } finally {
    if (oldDefine) {
      define = oldDefine;
    }
  }
}
