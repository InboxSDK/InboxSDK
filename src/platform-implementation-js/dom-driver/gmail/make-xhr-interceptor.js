var _ = require('lodash');
var Bacon = require('baconjs');
var fs = require('fs');
var deparam = require('querystring').parse;

var injectScript = _.once(function() {
  if (!document.head.hasAttribute('data-inboxsdk-script-injected')) {
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.text = fs.readFileSync(__dirname+'/../../../../dist/injected.js', 'utf8');
    document.head.appendChild(script).parentNode.removeChild(script);
    document.head.setAttribute('data-inboxsdk-script-injected', true);
  }
});

function makeXhrInterceptor() {
  injectScript();

  var rawInterceptStream = Bacon
    .fromEventTarget(document, 'inboxSDKajaxIntercept')
    .map('.detail');

  var interceptStream = Bacon.mergeAll(
    rawInterceptStream.filter(function(detail) {
      return detail.type === 'emailSending';
    }).map(function(detail) {
      var body = deparam(detail.body);
      return {
        type: 'emailSending',
        composeId: body.composeid,
        draft: body.draft
      };
    }),
    rawInterceptStream.filter(function(detail) {
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

  var threadMetadataOracle = {
    getThreadIdForThreadRow: function(threadRow) {
      var threadid = threadRow.getAttribute('data-inboxsdk-threadid');
      if (!threadid) {
        var event = document.createEvent('CustomEvent');
        event.initCustomEvent('inboxSDKtellMeThisThreadId', true, false, null);
        threadRow.dispatchEvent(event);
        threadid = threadRow.getAttribute('data-inboxsdk-threadid');
      }
      return threadid;
    }
  };

  return {
    xhrInterceptStream: interceptStream,
    threadMetadataOracle: threadMetadataOracle
  };
}

module.exports = makeXhrInterceptor;
