import makeMutationObserverStream from '../../../../lib/dom/make-mutation-observer-stream';
import type GmailComposeView from '../gmail-compose-view';
export default function (gmailComposeView: GmailComposeView) {
  var bodyElement = gmailComposeView.getBodyElement();
  return makeMutationObserverStream(bodyElement, {
    childList: true,
    subtree: true,
    characterData: true,
  }).map(function () {
    return {
      eventName: 'bodyChanged' as const,
    };
  });
}
