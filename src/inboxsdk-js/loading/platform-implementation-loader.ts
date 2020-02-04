import once from 'lodash/once';
import loadScript from '../../common/load-script';

import { PlatformImplementation } from '../../platform-implementation-js/platform-implementation';

const PlatformImplementationLoader = {
  load(appId: string, opts: object): Promise<PlatformImplementation> {
    return Promise.resolve()
      .then(() => {
        if (!(global as any).__InboxSDKImpLoader) {
          return PlatformImplementationLoader._loadScript().then(() => {
            if (!(global as any).__InboxSDKImpLoader) {
              throw new Error('Implementation file did not load correctly');
            }
          });
        }
      })
      .then(() => (global as any).__InboxSDKImpLoader.load('0.1', appId, opts));
  },

  _loadScript: once(function() {
    let disableSourceMappingURL = true;
    if (window.localStorage) {
      try {
        disableSourceMappingURL =
          localStorage.getItem('inboxsdk__enable_sourcemap') !== 'true';
      } catch (err) {
        console.error(err); //eslint-disable-line no-console
      }
    }

    return loadScript(process.env.IMPLEMENTATION_URL!, {
      nowrap: true, // platform-implementation has no top-level vars so no need for function wrapping
      disableSourceMappingURL
    });
  }),

  preload() {
    // Prime the load by calling it and letting the promise be memoized.
    PlatformImplementationLoader._loadScript();
  }
};

export default PlatformImplementationLoader;
