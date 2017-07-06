/* @flow */

import MockMutationObserver from './mock-mutation-observer';
import jsdomDoc from './jsdom-doc';
import once from 'lodash/once';

const docCb = once(() => jsdomDoc(''));

function addHtmlClasses() {
  const names = [];
  const doc = docCb();
  Object.getOwnPropertyNames(doc.defaultView).filter(x => x.startsWith('HTML')).forEach(name => {
    global[name] = doc.defaultView[name];
    names.push(name);
  });
  return names;
}

function CustomEvent(type, options={}) {
  const event = (global.document || docCb()).createEvent("CustomEvent");
  (event: any).initCustomEvent(type, options.bubbles, options.cancelable, options.detail);
  return event;
}

export default function fakePageGlobals() {
  if (global.before) { // We're in mocha
    // First we set all of the globals to undefined so that mocha doesn't think
    // they're accidental globals introduced later.
    let names = ['MutationObserver', 'CustomEvent', 'Node'];
    names = names.concat(addHtmlClasses());

    names.forEach(name => {
      global[name] = undefined;
    });

    // Now set the globals to their real values.
    global.before(function() {
      addHtmlClasses();
      global.MutationObserver = MockMutationObserver;
      global.CustomEvent = CustomEvent;
      global.Node = (global.document || docCb()).defaultView.Node;
    });

    // Unset them so that we don't affect the rest of the tests.
    global.after(function() {
      names.forEach(name => {
        global[name] = undefined;
      });
    });
  } else { // not in mocha
    addHtmlClasses();
    global.MutationObserver = MockMutationObserver;
    global.CustomEvent = CustomEvent;
    global.Node = (global.document || docCb()).defaultView.Node;
  }
}
