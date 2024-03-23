import browser from 'webextension-polyfill';
import once from 'lodash/once';
import Kefir from 'kefir';
import makeMutationObserverChunkedStream from './dom/make-mutation-observer-chunked-stream';

declare global {
  /** Set by webpack.DefinePlugin to remove a code block potentially flagged by Chrome Web Store reviews. */
  var NPM_MV2_SUPPORT: false | undefined;
}

let injectScriptImplementation: () => void = () => {
  browser.runtime
    .sendMessage({ type: 'inboxsdk__injectPageWorld' })
    .then((didExecute: boolean) => {
      if (!didExecute) return;

      if (NPM_MV2_SUPPORT) {
        // MV2 support.
        // Removed from regular MV3 NPM builds to not falsely set off Chrome Web Store
        // about dynamically-loaded code.
        const scr = document.createElement('script');
        scr.type = 'text/javascript';
        scr.src = browser.runtime.getURL('pageWorld.js');
        document.documentElement.appendChild(scr);
      } else {
        throw new Error(
          "Couldn't inject pageWorld.js. Check that the extension is using MV3 and has the correct permissions and host_permissions in its manifest.",
        );
      }
    });
};

// Returns a promise that resolves once the injected script has been injected
// and has done its initial load stuff.
export const injectScript = once((): Promise<null> => {
  if (!document.head.hasAttribute('data-inboxsdk-script-injected')) {
    document.head.setAttribute('data-inboxsdk-script-injected', 'true');

    injectScriptImplementation();
  }

  return Kefir.later(0, null)
    .merge(
      makeMutationObserverChunkedStream(document.head, {
        attributes: true,
      }),
    )
    .filter(() =>
      document.head.hasAttribute('data-inboxsdk-user-email-address'),
    )
    .take(1)
    .map(() => null)
    .toPromise();
});

export function setInjectScriptImplementation(fn: () => void) {
  injectScriptImplementation = fn;
}
