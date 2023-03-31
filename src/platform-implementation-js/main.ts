declare global {
  var __InboxSDKImpLoader: any;
}

if (!global.__InboxSDKImpLoader) {
  var piMainStarted = Date.now();
  var wasAccountSwitcherReadyAtStart = !!document.querySelector(
    '[role=banner] div[aria-label] div div a[href^="https://myaccount.google."], [role=banner]+div div[aria-label] div div a[href^="https://myaccount.google."]'
  );

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  var Kefir = require('kefir');

  var onready = new Promise<void>((resolve) => {
    if (
      document.readyState === 'complete' ||
      document.readyState === 'interactive'
    ) {
      resolve();
    } else {
      resolve(
        Kefir.merge([
          Kefir.fromEvents(document, 'DOMContentLoaded'),
          Kefir.fromEvents(window, 'load'),
        ])
          .take(1)
          .map(() => null)
          .toPromise()
      );
    }
  });

  global.__InboxSDKImpLoader = {
    load: function (version: string, appId: string, opts: any) {
      if (version !== '0.1') {
        throw new Error('Unsupported InboxSDK version');
      }

      // dropbox specially requested this, they have dropped support for their extensions
      // some users are on old version
      if (appId === 'dropbox') {
        throw new Error('No longer supported');
      }

      var piLoadStarted = Date.now();
      return onready.then(() => {
        const {
          makePlatformImplementation,
          // eslint-disable-next-line @typescript-eslint/no-var-requires
        } = require('./platform-implementation');
        return makePlatformImplementation(appId, opts, {
          piMainStarted,
          piLoadStarted,
          wasAccountSwitcherReadyAtStart,
        });
      });
    },
  };
}

export {};
