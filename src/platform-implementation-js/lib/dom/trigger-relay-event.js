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

function arrayBufferToArray(buf: ArrayBuffer): number[] {
  const uint8Array = new Uint8Array(buf);
  const bytes = new Array(uint8Array.length);
  for (let i=0, len=uint8Array.length; i<len; i++) {
    bytes[i] = uint8Array[i];
  }
  return bytes;
}

async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.onload = function() {
      const arrayBuffer: ArrayBuffer = this.result;
      resolve(arrayBuffer);
    };
    fileReader.onerror = reject;
    fileReader.readAsArrayBuffer(blob);
  });
}

export default async function triggerRelayEvent(element: HTMLElement, detail: RelayProps): Promise<void> {
  const detailToSend = _.clone(detail);
  if (detail.dataTransfer) {
    const serializedFiles = [];
    for (let file of detail.dataTransfer.files) {
      const arrayBuffer = await blobToArrayBuffer(file);
      const data = arrayBufferToArray(arrayBuffer);
      serializedFiles.push({
        data, type: file.type,
        name: (file:any).name, lastModifiedDate: (file:any).lastModifiedDate
      });
    }
    detailToSend.dataTransfer = {
      files: serializedFiles
    };
  }

  element.dispatchEvent(new CustomEvent('inboxsdk_event_relay', {
    bubbles: true,
    cancelable: false,
    detail: detailToSend
  }));
}
