import _ from 'lodash';

export default function setupEventReemitter() {
  // Webkit has bugs that stop certain types of events from being created. We
  // can manually fake creation of those events, but we have to do it from
  // inside the page's script if we want the page's script to see the modified
  // properties.
  // https://bugs.webkit.org/show_bug.cgi?id=16735
  // https://code.google.com/p/chromium/issues/detail?id=327853
  document.addEventListener('inboxsdk_event_relay', function(event) {
    const newEvent = document.createEvent('Events');
    newEvent.initEvent(event.detail.type, event.detail.bubbles, event.detail.cancelable);
    _.assign(newEvent, event.detail.props);
    event.target.dispatchEvent(newEvent);
  });
}
