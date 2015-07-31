/* @flow */
//jshint ignore:start

import assign from 'lodash/object/assign';
import once from 'lodash/function/once';
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
    return loadScript(process.env.IMPLEMENTATION_URL);
  }),

  preload() {
    // Prime the load by calling it and letting the promise be memoized.
    this._loadScript();
  }
};

export default PlatformImplementationLoader;
