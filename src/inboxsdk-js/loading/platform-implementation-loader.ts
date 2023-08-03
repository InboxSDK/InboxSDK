import { PlatformImplementation } from '../../platform-implementation-js/platform-implementation';

const PlatformImplementationLoader = {
  load(appId: string, opts: any): Promise<PlatformImplementation> {
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

  _loadScript: function (): Promise<void> {
    throw new Error('Unexpected error: This function must be overridden');
  },

  preload() {
    // Prime the load by calling it and letting the promise be memoized.
    PlatformImplementationLoader._loadScript();
  },
};

export default PlatformImplementationLoader;
