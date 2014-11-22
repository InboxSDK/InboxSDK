var _ = require('lodash');
var Bacon = require('baconjs');
var fs = require('fs');

var injectScript = _.once(function() {
  if (!document.head.hasAttribute('data-inboxsdk-script-injected')) {
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.text = fs.readFileSync(__dirname+'/../../../../dist/injected.js');
    document.head.appendChild(script).parentNode.removeChild(script);
    document.head.setAttribute('data-inboxsdk-script-injected', true);
  }
});

function makeXhrInterceptStream() {
  injectScript();
  return Bacon.mergeAll([]);
}

module.exports = makeXhrInterceptStream;
