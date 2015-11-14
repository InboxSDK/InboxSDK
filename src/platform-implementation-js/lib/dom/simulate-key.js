/* @flow */
// jshint ignore:start

import _ from 'lodash';
import triggerRelayEvent from './trigger-relay-event';

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
