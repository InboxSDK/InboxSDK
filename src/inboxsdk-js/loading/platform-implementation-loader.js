/* @flow */
//jshint ignore:start

const once = require('lodash/function/once');
import loadScript from '../../common/load-script';

import type {PlatformImplementation} from '../../platform-implementation-js/platform-implementation';

var PlatformImplementationLoader = {
  load(appId: string, opts: Object): Promise<PlatformImplementation> {
    return global.Promise.resolve().then(() => {
      if (!global.__InboxSDKImpLoader) {
        return PlatformImplementationLoader._loadScript().then(() => {
          if (!global.__InboxSDKImpLoader) {
            throw new Error("Implementation file did not load correctly");
          }
        });
      }
    }).then(() =>
      global.__InboxSDKImpLoader.load("0.1", appId, opts)
    );
  },

  _loadScript: once(function() {
    let disableSourceMappingURL = true;
    if (window.localStorage) {
      try {
        disableSourceMappingURL = localStorage.getItem('inboxsdk__enable_sourcemap') !== 'true';
      } catch(err) {
        console.error(err);
      }
    }

    return loadScript((process.env.IMPLEMENTATION_URL:any), {
      nowrap: true, // platform-implementation has no top-level vars so no need for function wrapping
      disableSourceMappingURL
    });
  }),

  preload() {
    // Prime the load by calling it and letting the promise be memoized.
    this._loadScript();
  }
};

export default PlatformImplementationLoader;
