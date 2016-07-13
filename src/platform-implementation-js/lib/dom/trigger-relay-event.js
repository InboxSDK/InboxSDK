/* @flow */
//jshint ignore:start

import _ from 'lodash';

type RelayProps = {
  type: string;
  bubbles: boolean;
  cancelable: boolean;
  props?: ?Object;
  dataTransfer?: ?{
    files: Blob[];
  };
}

export default async function triggerRelayEvent(element: HTMLElement, detail: RelayProps): Promise<void> {
  element.dispatchEvent(new CustomEvent('inboxsdk_event_relay', {
    bubbles: true,
    cancelable: false,
    detail
  }));
}
