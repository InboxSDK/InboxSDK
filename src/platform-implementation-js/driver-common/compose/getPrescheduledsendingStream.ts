import asap from 'asap';
import * as Kefir from 'kefir';
import fromEventTargetCapture from '../../lib/from-event-target-capture';

const dispatchCancel = (
  element: Element, // asap necessary so we don't emit this event during the click event dispatch
) =>
  asap(() =>
    element.dispatchEvent(
      new CustomEvent('inboxSDKscheduledsendCanceled', {
        bubbles: false,
        cancelable: false,
        detail: null,
      }),
    ),
  );

export default function ({
  element,
  scheduleSendButton,
}: {
  element: HTMLElement;
  scheduleSendButton: HTMLElement;
}) {
  const domEventStream = Kefir.merge([
    fromEventTargetCapture(element, 'mouseup').filter(
      (domEvent) =>
        (scheduleSendButton && scheduleSendButton.contains(domEvent.target)),
    ),
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
    })
    .map((domEvent) => ({
      eventName: 'prescheduledsending' as const,
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
