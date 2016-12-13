/* @flow */

import triggerRelayEvent from './trigger-relay-event';

export default function simulateKey(element: HTMLElement, keyCode: number, charCode: number) {
  const ctrlKey = false;
  const metaKey = false;
  const altKey = false;
  const shiftKey = false;

  triggerRelayEvent(element, {
    type: 'keydown', bubbles: true, cancelable: true,
    props: {
      keyCode, charCode,
      ctrlKey, metaKey, altKey, shiftKey
    }
  });

  triggerRelayEvent(element, {
    type: 'keypress', bubbles: true, cancelable: true,
    props: {
      keyCode, charCode,
      ctrlKey, metaKey, altKey, shiftKey
    }
  });

  triggerRelayEvent(element, {
    type: 'keyup', bubbles: true, cancelable: true,
    props: {
      keyCode, charCode,
      ctrlKey, metaKey, altKey, shiftKey
    }
  });
}
