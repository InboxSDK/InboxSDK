import type {
  PiOpts,
  PlatformImplementation,
} from '../../platform-implementation-js/platform-implementation';

export class PlatformImplementationLoader {
  /**
   * This must be overridden by the entrypoint to the InboxSDK.
   * This is done so the npm (non-remote) build doesn't contain code for dynamically
   * loading the remote build, which may set off the Chrome Web Store review process
   * scanning for that.
   */
  static loadScript: () => Promise<void> = () => {
    throw new Error('Unexpected error: This function must be overridden');
  };

  static async load(
    appId: string,
    opts: PiOpts
  ): Promise<PlatformImplementation> {
    if (!global.__InboxSDKImpLoader) {
      await this.loadScript();
      if (!global.__InboxSDKImpLoader) {
        throw new Error('Implementation file did not load correctly');
      }
    }
    return global.__InboxSDKImpLoader.load('0.1', appId, opts);
  }

  static async preload() {
    // Prime the load by calling it and letting the promise be memoized.
    this.loadScript();
  }
}
