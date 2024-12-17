import asap from 'asap';
import * as Kefir from 'kefir';
import fromEventTargetCapture from '../../lib/from-event-target-capture';

const dispatchCancel = (
  element: Element, // asap necessary so we don't emit this event during the click event dispatch
) =>
  asap(() =>
    element.dispatchEvent(
      new CustomEvent('inboxSDKscheduledSendCanceled', {
        bubbles: false,
        cancelable: false,
        detail: null,
      }),
    ),
  );

export default function getPrescheduledSendingStream({
  element,
  scheduleSendButton,
  moreSendOptionsButton,
}: {
  element: HTMLElement;
  scheduleSendButton: HTMLElement;
  moreSendOptionsButton: HTMLElement;
}) {
  const domEventStream = Kefir.merge([
    fromEventTargetCapture(element, 'keydown').filter(
      (domEvent) =>
        (domEvent.which === 13 || domEvent.keyCode === 13) &&
        moreSendOptionsButton &&
        moreSendOptionsButton.contains(domEvent.target),
    ),
    fromEventTargetCapture(element, 'mouseup').filter(
      (domEvent) =>
        scheduleSendButton && scheduleSendButton.contains(domEvent.target),
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
      // Do not process event if the element is not initiated by the user.
      if (!domEvent.isTrusted) {
        return false;
      }

      return true;
    })
    .map((domEvent) => ({
      eventName: 'prescheduledSending' as const,
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