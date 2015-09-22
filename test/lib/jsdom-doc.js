/* @flow */
//jshint ignore:start

const _ = require('lodash');
const jsdom = require('jsdom');
const assert = require('assert');

jsdom.defaultDocumentFeatures = {
  FetchExternalResources: false,
  ProcessExternalResources: false
};

function notImplemented() {
  throw new Error("mock classList modifiers not implemented");
}
const DOMTokenListPrototype = {
  contains(item) {
    return Array.prototype.indexOf.call(this, item) !== -1;
  },
  add: notImplemented, remove: notImplemented, toggle: notImplemented
};

export default function jsdomDoc(html: string): Document {
  const document: Document = (jsdom.jsdom(html): any);

  const originalCreateEvent = document.createEvent;
  (document:any).createEvent = function(type) {
    const event = originalCreateEvent.apply(this, arguments);
    if (type == 'CustomEvent') {
      assert(!(event:any).initCustomEvent);
      (event:any).initCustomEvent = function(type, bubbles, cancelable, detail) {
        if (detail) {
          throw new Error("mock initCustomEvent doesn't support detail parameter");
        }
        event.initEvent(type, bubbles, cancelable);
      };
    }
    return event;
  };

  return document;
}
