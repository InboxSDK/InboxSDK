import defer from '../../common/defer';
import type {
  PiOpts,
  PlatformImplementation,
} from '../../platform-implementation-js/platform-implementation';

export class PlatformImplementationLoader {
  static #loadScript = defer<() => Promise<void>>();

  static async load(
    appId: string,
    opts: PiOpts
  ): Promise<PlatformImplementation> {
    if (!global.__InboxSDKImpLoader) {
      const loadScript = await Promise.race([
        PlatformImplementationLoader.#loadScript.promise,
        new Promise<() => Promise<void>>((_resolve, reject) => {
          setTimeout(
            () =>
              reject(
                new Error('Unexpected error: This function must be overridden')
              ),
            5_000
          );
        }),
      ]);
      await loadScript();
      if (!global.__InboxSDKImpLoader) {
        throw new Error('Implementation file did not load correctly');
      }
    }
    return global.__InboxSDKImpLoader.load('0.1', appId, opts);
  }

  static set loadScript(fn: () => Promise<void>) {
    PlatformImplementationLoader.#loadScript.resolve(fn);
  }

  static async preload() {
    const loadScript = await PlatformImplementationLoader.#loadScript.promise;
    // Prime the load by calling it and letting the promise be memoized.
    loadScript();
  }
}
