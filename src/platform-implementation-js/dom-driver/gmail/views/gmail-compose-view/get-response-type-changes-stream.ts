import * as Kefir from 'kefir';
import Logger from '../../../../lib/logger';
import makeMutationObserverChunkedStream from '../../../../lib/dom/make-mutation-observer-chunked-stream';
import querySelector from '../../../../lib/dom/querySelectorOrFail';
import type GmailComposeView from '../gmail-compose-view';
export default function (
  gmailComposeView: GmailComposeView
): Kefir.Observable<Record<string, any>, unknown> {
  let responseTypeEl;

  try {
    responseTypeEl = querySelector(
      gmailComposeView.getElement(),
      '.J-J5-Ji .J-JN-M-I-Jm > img'
    );
    return makeMutationObserverChunkedStream(responseTypeEl, {
      attributeFilter: ['class'],
      attributes: true,
    }).map(() => ({
      data: {
        isForward: gmailComposeView.isForward(),
      },
      eventName: 'responseTypeChanged',
    }));
  } catch (err) {
    Logger.error(err);
    return Kefir.never();
  }
}
