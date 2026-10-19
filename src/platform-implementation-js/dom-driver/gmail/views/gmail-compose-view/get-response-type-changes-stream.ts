import * as Kefir from 'kefir';
import Logger from '../../../../lib/logger';
import makeMutationObserverChunkedStream from '../../../../lib/dom/make-mutation-observer-chunked-stream';
import type GmailComposeView from '../gmail-compose-view';

export default function (gmailComposeView: GmailComposeView) {
  let responseTypeEl;

  try {
    responseTypeEl = gmailComposeView
      .getGmailDriver()
      .selectors.querySelectorByKeyOrFail(
        gmailComposeView.getElement(),
        'composeView.responseTypeIcon',
      );
    return makeMutationObserverChunkedStream(responseTypeEl, {
      attributeFilter: ['class'],
      attributes: true,
    }).map(() => ({
      data: {
        isForward: gmailComposeView.isForward(),
      },
      eventName: 'responseTypeChanged' as const,
    }));
  } catch (err) {
    Logger.error(err);
    return Kefir.never();
  }
}
