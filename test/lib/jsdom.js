var _ = require('lodash');
var jsdom = require('jsdom');

jsdom.defaultDocumentFeatures = {
  FetchExternalResources: false,
  ProcessExternalResources: false
};

var hasAddedClassList = false;

function main() {
  var document = jsdom.jsdom.apply(jsdom, arguments);

  // Monkey-patch the Element prototype to have a simple classList getter.
  if (!hasAddedClassList) {
    var div = document.createElement("div");
    var proto = div;
    do {
      proto = Object.getPrototypeOf(proto);
    } while (!_.has(proto, 'className'));
    Object.defineProperty(proto, 'classList', {
      get: function() {
        var list = this.className.split(' ');
        list.contains = function(item) {
          return this.indexOf(item) !== -1;
        };
        list.add = list.remove = list.toggle = function() {
          throw new Error("mock classList modifiers not implemented");
        };
        return Object.freeze(list);
      }
    });
  }

  return document;
}

module.exports = main;
