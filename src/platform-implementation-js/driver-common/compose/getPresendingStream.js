/* @flow */

import asap from 'asap';
import Kefir from 'kefir';
import fromEventTargetCapture from '../../lib/from-event-target-capture';

const dispatchCancel = (element) => (
  // asap necessary so we don't emit this event during the click/keydown event dispatch
  asap(() => (
    element.dispatchEvent(new CustomEvent('inboxSDKsendCanceled', {
      bubbles: false,
      cancelable: false,
      detail: null
    }))
  ))
);

export default function({
  element,
  sendButton,
  sendAndArchive
}: {
  element: HTMLElement,
  sendButton: HTMLElement,
  sendAndArchive?: ?HTMLElement
}): Kefir.Observable<Object> {
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
        (sendButton && sendButton.contains(domEvent.target)) ||
        (sendAndArchive && sendAndArchive.contains(domEvent.target))
      )),

    fromEventTargetCapture(element, 'click')
      .filter(domEvent => (
        (sendButton && sendButton.contains(domEvent.target)) ||
        (sendAndArchive && sendAndArchive.contains(domEvent.target))
      ))
  ]);

  return domEventStream
    .filter((domEvent) => {
      if (element.hasAttribute('data-inboxsdk-send-replaced')) {
        domEvent.preventDefault();
        domEvent.stopPropagation();
        domEvent.stopImmediatePropagation();
        return false;
      }
      return true;
    }).map(domEvent => ({
      eventName: 'presending',
      data: {
        cancel() {
          domEvent.preventDefault();
          domEvent.stopPropagation();
          domEvent.stopImmediatePropagation();
          dispatchCancel(element);
        }
      }
    }));
}
