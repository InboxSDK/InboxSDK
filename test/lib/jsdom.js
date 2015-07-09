import _ from 'lodash';
import jsdom from 'jsdom';
import assert from 'assert';

jsdom.defaultDocumentFeatures = {
  FetchExternalResources: false,
  ProcessExternalResources: false
};

let hasAddedClassList = false;

function notImplemented() {
  throw new Error("mock classList modifiers not implemented");
}
const DOMTokenListPrototype = {
  contains: function(item) {
    return Array.prototype.indexOf.call(this, item) !== -1;
  },
  add: notImplemented, remove: notImplemented, toggle: notImplemented
};

export default function main() {
  const document = jsdom.jsdom.apply(jsdom, arguments);

  // Monkey-patch the Element prototype to have some simple getters that jsdom
  // lacked.
  if (!hasAddedClassList) {
    const div = document.createElement("div");
    assert(!('classList' in div));
    let proto = div;
    do {
      proto = Object.getPrototypeOf(proto);
    } while (!_.has(proto, 'className'));
    Object.defineProperty(proto, 'classList', {
      get() {
        // jshint -W103
        const list = this.className.split(' ').filter(Boolean);
        list.__proto__ = DOMTokenListPrototype;
        return Object.freeze(list);
      }
    });
    assert(!('firstElementChild' in proto));
    Object.defineProperty(proto, 'firstElementChild', {
      get() {
        for (let i=0, len=this.children.length; i<len; i++) {
          const child = this.children[i];
          if (child.nodeType === 1) {
            return child;
          }
        }
        return null;
      }
    });
    assert(!('lastElementChild' in proto));
    Object.defineProperty(proto, 'lastElementChild', {
      get() {
        for (let i=this.children.length-1; i>=0; i--) {
          const child = this.children[i];
          if (child.nodeType === 1) {
            return child;
          }
        }
        return null;
      }
    });
    assert(!('nextElementSibling' in proto));
    Object.defineProperty(proto, 'nextElementSibling', {
      get() {
        var sibling = this;
        while ((sibling = sibling.nextSibling)) {
          if (sibling.nodeType === 1) {
            return sibling;
          }
        }
        return null;
      }
    });
    assert(!('previousElementSibling' in proto));
    Object.defineProperty(proto, 'previousElementSibling', {
      get() {
        var sibling = this;
        while ((sibling = sibling.previousSibling)) {
          if (sibling.nodeType === 1) {
            return sibling;
          }
        }
        return null;
      }
    });
    assert(!('parentElement' in proto));
    Object.defineProperty(proto, 'parentElement', {
      get() {
        return this.parentNode;
      }
    });

    hasAddedClassList = true;
  }

  const originalCreateEvent = document.createEvent;
  document.createEvent = function(type) {
    const event = originalCreateEvent.apply(this, arguments);
    if (type == 'CustomEvent') {
      assert(!event.initCustomEvent);
      event.initCustomEvent = function(type, bubbles, cancelable, detail) {
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
