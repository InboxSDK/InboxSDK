/* @flow */

export default function setupEventReemitter() {
  // Webkit has bugs that stop certain types of events from being created. We
  // can manually fake creation of those events, but we have to do it from
  // inside the page's script if we want the page's script to see the modified
  // properties.
  // https://bugs.webkit.org/show_bug.cgi?id=16735
  // https://code.google.com/p/chromium/issues/detail?id=327853
  document.addEventListener('inboxsdk_event_relay', function(event: Object) {
    const newEvent = document.createEvent('Events');
    (newEvent: any).initEvent(event.detail.type, event.detail.bubbles, event.detail.cancelable);
    Object.assign(newEvent, event.detail.props);
    if (event.detail.dataTransfer) {
      const {files, fileNames} = event.detail.dataTransfer;
      if (fileNames) {
        fileNames.forEach((fileName, i) => {
          const file = files[i];
          if (typeof file.name !== 'string') {
            file.name = fileName;
          }
        });
      }
      (newEvent:any).dataTransfer = {
        dropEffect: "none",
        effectAllowed: "all",
        files,
        items: files.map(({type}, i) => ({
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
