import { type PlatformImplementation } from './platform-implementation';

declare global {
  var __InboxSDKImpLoader: {
    load: (
      version: string,
      appId: string,
      opts: any
    ) => Promise<PlatformImplementation>;
  };
}

if (!global.__InboxSDKImpLoader) {
  var piMainStarted = Date.now();
  var wasAccountSwitcherReadyAtStart = !!document.querySelector(
    '[role=banner] div[aria-label] div div a[href^="https://myaccount.google."], [role=banner]+div div[aria-label] div div a[href^="https://myaccount.google."]'
  );

  var onready = new Promise<void>((resolve) => {
    if (
      document.readyState === 'complete' ||
      document.readyState === 'interactive'
    ) {
      resolve();
    } else {
      const fromEvent = async (event: 'DOMContentLoaded' | 'load') =>
        new Promise<void>((resolve) =>
          document.addEventListener(event, () => {
            resolve();
          })
        );
      Promise.all([fromEvent('DOMContentLoaded'), fromEvent('load')]).then(() =>
        resolve()
      );
    }
  });

  global.__InboxSDKImpLoader = {
    async load(version, appId, opts) {
      if (version !== '0.1') {
        throw new Error('Unsupported InboxSDK version');
      }

      // dropbox specially requested this, they have dropped support for their extensions
      // some users are on old version
      if (appId === 'dropbox') {
        throw new Error('No longer supported');
      }

      var piLoadStarted = Date.now();
      await onready;
      const { makePlatformImplementation } = await import(
        /* webpackMode: 'eager' */
        './platform-implementation'
      );
      return makePlatformImplementation(appId, opts, {
        piMainStarted,
        piLoadStarted,
        wasAccountSwitcherReadyAtStart,
      });
    },
  };
}

export {};
