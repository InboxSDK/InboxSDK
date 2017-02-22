/* @flow */

import asap from 'asap';
import Kefir from 'kefir';
import fromEventTargetCapture from '../../../../lib/from-event-target-capture';

import type GmailComposeView from '../gmail-compose-view';

const dispatchCancel = (element) => (
  asap(() => (
    element.dispatchEvent(new CustomEvent('inboxSDKsendCanceled', {
      bubbles: false,
      cancelable: false,
      detail: null
    }))
  ))
);

export default function(gmailComposeView: GmailComposeView): Kefir.Observable<Object> {

  const element = gmailComposeView.getElement();
  const sendButtonElement = gmailComposeView.getSendButton();
  const sendAndArchiveButtonElement = gmailComposeView.getSendAndArchiveButton();

  const domEventStream = Kefir.merge([
    fromEventTargetCapture(element, 'keydown')
      .filter(domEvent => domEvent.ctrlKey || domEvent.metaKey)
      .filter(domEvent => domEvent.which === 13 || domEvent.keyCode === 13),

    fromEventTargetCapture(element, 'keydown')
      .filter(domEvent => (
        [13, 32].indexOf(domEvent.which) > -1 ||
        [13, 32].indexOf(domEvent.keyCode) > -1
      ))
      .filter(domEvent => (
        (sendButtonElement && sendButtonElement.contains(domEvent.srcElement)) ||
        (sendAndArchiveButtonElement && sendAndArchiveButtonElement.contains(domEvent.srcElement))
      )),

    fromEventTargetCapture(element, 'click')
      .filter(domEvent => (
        (sendButtonElement && sendButtonElement.contains(domEvent.srcElement)) ||
        (sendAndArchiveButtonElement && sendAndArchiveButtonElement.contains(domEvent.srcElement))
      ))
  ]);

  return domEventStream.map(domEvent => ({
    eventName: 'presending',
    data: {
      cancel() {
        domEvent.preventDefault();
        domEvent.stopPropagation();
        domEvent.stopImmediatePropagation();
        dispatchCancel(element)
      }
    }
  }));
}
