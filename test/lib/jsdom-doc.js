/* @flow */
//jshint ignore:start

var _ = require('lodash');
var jsdom = require('jsdom');
var assert = require('assert');

jsdom.defaultDocumentFeatures = {
  FetchExternalResources: false,
  ProcessExternalResources: false
};

var/*let*/ hasAddedClassList = false;

function notImplemented() {
  throw new Error("mock classList modifiers not implemented");
}
var/*const*/ DOMTokenListPrototype = {
  contains(item) {
    return Array.prototype.indexOf.call(this, item) !== -1;
  },
  add: notImplemented, remove: notImplemented, toggle: notImplemented
};

export default function jsdomDoc(html: string): Document {
  var/*const*/ document: Document = (jsdom.jsdom(html): any);

  // Monkey-patch the Element prototype to have some simple getters that jsdom
  // lacked.
  if (!hasAddedClassList) {
    var/*const*/ div = document.createElement("div");
    assert(!('classList' in div));
    var/*let*/ proto: Object = div;
    do {
      proto = Object.getPrototypeOf(proto);
    } while (!_.has(proto, 'className'));
    (Object:any).defineProperty(proto, 'classList', {
      get() {
        // jshint -W103
        var/*const*/ list = this.className.split(' ').filter(Boolean);
        list.__proto__ = DOMTokenListPrototype;
        return Object.freeze(list);
      }
    });
    assert(!('firstElementChild' in proto));
    (Object:any).defineProperty(proto, 'firstElementChild', {
      get() {
        for (var/*let*/ i=0, len=this.children.length; i<len; i++) {
          var/*const*/ child = this.children[i];
          if (child.nodeType === 1) {
            return child;
          }
        }
        return null;
      }
    });
    assert(!('lastElementChild' in proto));
    (Object:any).defineProperty(proto, 'lastElementChild', {
      get() {
        for (var/*let*/ i=this.children.length-1; i>=0; i--) {
          var/*const*/ child = this.children[i];
          if (child.nodeType === 1) {
            return child;
          }
        }
        return null;
      }
    });
    assert(!('nextElementSibling' in proto));
    (Object:any).defineProperty(proto, 'nextElementSibling', {
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
    (Object:any).defineProperty(proto, 'previousElementSibling', {
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

    hasAddedClassList = true;
  }

  var/*const*/ originalCreateEvent = document.createEvent;
  (document:any).createEvent = function(type) {
    var/*const*/ event = originalCreateEvent.apply(this, arguments);
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
