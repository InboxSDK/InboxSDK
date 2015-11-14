/* @flow */
//jshint ignore:start

import _ from 'lodash';

type RFileInfo = {
  data: number[];
  type: string;
  name: ?string;
  lastModifiedDate: ?number;
};

export default function setupEventReemitter() {
  // Webkit has bugs that stop certain types of events from being created. We
  // can manually fake creation of those events, but we have to do it from
  // inside the page's script if we want the page's script to see the modified
  // properties.
  // https://bugs.webkit.org/show_bug.cgi?id=16735
  // https://code.google.com/p/chromium/issues/detail?id=327853
  document.addEventListener('inboxsdk_event_relay', function(event: Object) {
    const newEvent = document.createEvent('Events');
    newEvent.initEvent(event.detail.type, event.detail.bubbles, event.detail.cancelable);
    _.assign(newEvent, event.detail.props);
    if (event.detail.dataTransfer) {
      const files = event.detail.dataTransfer.files
        .map(({data, type, name, lastModifiedDate}: RFileInfo) => {
          const ia = new Uint8Array(data.length);
          for (let i = 0; i < data.length; i++) {
            ia[i] = data[i];
          }
          const blob = new Blob([ia], {type});
          if (name) {
            (blob:any).name = name;
          }
          if (lastModifiedDate) {
            (blob:any).lastModifiedDate = new Date(lastModifiedDate);
          }
          return blob;
        });
      (newEvent:any).dataTransfer = {
        dropEffect: "none",
        effectAllowed: "all",
        files,
        items: event.detail.dataTransfer.files.map(({type}, i) => ({
          kind: "file", type,
          getAsFile() {return files[i];},
          getAsString() {throw new Error('getAsString not supported');}
        })),
        types: ["Files"],
        getData() {return '';},
        setData() {},
        setDragImage() {}
      };
    }
    event.target.dispatchEvent(newEvent);
  });
}
