/* @flow */

import once from 'lodash/once';
import Kefir from 'kefir';
import makeMutationObserverChunkedStream from './dom/make-mutation-observer-chunked-stream';

// Returns a promise that resolves once the injected script has been injected
// and has done its initial load stuff.
const injectScript: () => Promise<null> = once(function() {
  if (!(document.head: any).hasAttribute('data-inboxsdk-script-injected')) {
    (document.head: any).setAttribute('data-inboxsdk-script-injected', 'true');

    window.chrome.runtime.sendMessage(
      { type: 'inboxsdk__injectPageWorld' },
      didExecute => {
        if (!didExecute) {
          // MV2 support
          const scr = document.createElement('script');
          scr.type = 'text/javascript';
          scr.src = window.chrome.runtime.getURL('pageWorld.js');
          document.documentElement.appendChild(scr);
        }
      }
    );
  }

  return Kefir.later(0, null)
    .merge(
      makeMutationObserverChunkedStream((document.head: any), {
        attributes: true
      })
    )
    .filter(() =>
      (document.head: any).hasAttribute('data-inboxsdk-user-email-address')
    )
    .take(1)
    .map(() => null)
    .toPromise();
});

if ((module: any).hot) {
  (module: any).hot.accept();
}

export default injectScript;
