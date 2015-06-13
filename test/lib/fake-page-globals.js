import MockMutationObserver from './mock-mutation-observer';

export default function fakePageGlobals() {
  global.MutationObserver = MockMutationObserver;
  global.CustomEvent = function CustomEvent(type, options={}) {
    var event = document.createEvent("CustomEvent");
    event.initCustomEvent(type, options.bubbles, options.cancelable, options.detail);
    return event;
  };
}
