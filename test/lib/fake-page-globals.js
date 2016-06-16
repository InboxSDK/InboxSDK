import MockMutationObserver from './mock-mutation-observer';
import jsdomDoc from './jsdom-doc';

export default function fakePageGlobals() {
  global.MutationObserver = MockMutationObserver;
  global.CustomEvent = function CustomEvent(type, options={}) {
    var event = document.createEvent("CustomEvent");
    event.initCustomEvent(type, options.bubbles, options.cancelable, options.detail);
    return event;
  };

  const doc = jsdomDoc('');
  Object.keys(doc.defaultView).filter(x => x.startsWith('HTML')).forEach(name => {
    global[name] = doc.defaultView[name];
  });
  doc.defaultView.close();

  if (!global.Promise) global.Promise = Promise; // node 0.10 compat
}
