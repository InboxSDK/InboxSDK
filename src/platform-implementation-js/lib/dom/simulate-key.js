/* @flow */
// jshint ignore:start

import _ from 'lodash';

export default function simulateKey(element: HTMLElement, keyCode: number, charCode: number) {
  var ctrlKey = false;
  var metaKey = false;
  var altKey = false;
  var shiftKey = false;

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

function triggerRelayEvent(element: HTMLElement, detail: any) {
  var event = new CustomEvent('inboxsdk_event_relay', {
    bubbles: true,
    cancelable: false,
    detail
  });
  element.dispatchEvent(event);
}
