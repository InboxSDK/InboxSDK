import once from 'lodash/once';
import Kefir from 'kefir';
import makeMutationObserverChunkedStream from './dom/make-mutation-observer-chunked-stream';

let injectScriptImplementation: () => void = () => {
  (window as any).chrome.runtime.sendMessage(
    { type: 'inboxsdk__injectPageWorld' },
    (didExecute: boolean) => {
      if (!didExecute) {
        // MV2 support
        const scr = document.createElement('script');
        scr.type = 'text/javascript';
        scr.src = (window as any).chrome.runtime.getURL('pageWorld.js');
        document.documentElement.appendChild(scr);
      }
    }
  );
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
      })
    )
    .filter(() =>
      document.head.hasAttribute('data-inboxsdk-user-email-address')
    )
    .take(1)
    .map(() => null)
    .toPromise();
});

export function setInjectScriptImplementation(fn: () => void) {
  injectScriptImplementation = fn;
}
