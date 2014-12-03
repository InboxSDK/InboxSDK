var _ = require('lodash');
var Bacon = require('baconjs');
var fs = require('fs');
var deparam = require('querystring').parse;

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

  var interceptStream = Bacon
    .fromEventTarget(document, 'inboxSDKajaxIntercept')
    .map('.detail');

  return Bacon.mergeAll(
    interceptStream.filter(function(detail) {
      return detail.type === 'emailSending';
    }).map(function(detail) {
      var body = deparam(detail.body);
      return {
        type: 'emailSending',
        composeId: body.composeid,
        draft: body.draft
      };
    }),
    interceptStream.filter(function(detail) {
      return detail.type === 'emailSent';
    }).map(function(detail) {
      var body = deparam(detail.originalSendBody);
      var response = detail.responseText;
      return {
        type: 'emailSent',
        composeId: body.composeid,
        draft: body.draft,
        response: response
      };
    })
  );
}

module.exports = makeXhrInterceptStream;
