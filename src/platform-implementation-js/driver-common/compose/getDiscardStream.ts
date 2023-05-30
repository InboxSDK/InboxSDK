import asap from 'asap';
import * as Kefir from 'kefir';
import fromEventTargetCapture from '../../lib/from-event-target-capture';

const dispatchCancel = (element: Element) =>
  asap(() =>
    element.dispatchEvent(
      new CustomEvent('inboxSDKdiscardCanceled', {
        bubbles: false,
        cancelable: false,
        detail: null,
      })
    )
  );

export default function getDiscardStream({
  element,
  discardButton,
}: {
  element: HTMLElement;
  discardButton: HTMLElement;
}): Kefir.Observable<Record<string, any>, unknown> {
  const domEventStream = Kefir.merge([
    fromEventTargetCapture(element, 'keydown')
      .filter(
        (domEvent) =>
          [13, 32].indexOf(domEvent.which) > -1 ||
          [13, 32].indexOf(domEvent.keyCode) > -1
      )
      .filter(
        (domEvent) => discardButton && discardButton.contains(domEvent.target)
      ),
    fromEventTargetCapture(element, 'click').filter(
      (domEvent) => discardButton && discardButton.contains(domEvent.target)
    ),
  ]);
  return domEventStream.map((domEvent) => ({
    eventName: 'discard',
    data: {
      cancel() {
        domEvent.preventDefault();
        domEvent.stopPropagation();
        domEvent.stopImmediatePropagation();
        dispatchCancel(element);
      },
    },
  }));
}
