import _ from 'lodash';

export default function simulateKey(element, keyCode, charCode) {
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

function triggerRelayEvent(element, detail) {
  const event = document.createEvent("CustomEvent");
  event.initCustomEvent('inboxsdk_event_relay', true, false, detail);
  element.dispatchEvent(event);
}
