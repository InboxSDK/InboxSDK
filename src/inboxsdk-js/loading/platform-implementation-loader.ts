import defer from '../../common/defer';
import type {
  PiOpts,
  PlatformImplementation,
} from '../../platform-implementation-js/platform-implementation';

export class PlatformImplementationLoader {
  static #loadScriptSet = defer<void>();

  static async load(
    appId: string,
    opts: PiOpts
  ): Promise<PlatformImplementation> {
    if (!global.__InboxSDKImpLoader) {
      await PlatformImplementationLoader.#loadScriptSet.promise;
      await PlatformImplementationLoader.#loadScript();
      if (!global.__InboxSDKImpLoader) {
        throw new Error('Implementation file did not load correctly');
      }
    }
    return global.__InboxSDKImpLoader.load('0.1', appId, opts);
  }

  static set loadScript(fn: () => Promise<void>) {
    PlatformImplementationLoader.#loadScript = fn;
    PlatformImplementationLoader.#loadScriptSet.resolve();
  }

  static #loadScript: () => Promise<void> = () => {
    throw new Error('Unexpected error: This function must be overridden');
  };

  static async preload() {
    await PlatformImplementationLoader.#loadScriptSet.promise;
    // Prime the load by calling it and letting the promise be memoized.
    await PlatformImplementationLoader.#loadScript();
  }
}
