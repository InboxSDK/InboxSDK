var _ = require('lodash');
var Bacon = require('baconjs');
var fs = require('fs');
var deparam = require('querystring').parse;
var threadMetadataOracle = require('./thread-metadata-oracle');

var injectScript = _.once(function() {
  if (!document.head.hasAttribute('data-inboxsdk-script-injected')) {
    var url = 'https://www.inboxsdk.com/build/injected.js';

    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.text = fs.readFileSync(__dirname+'/../../../../dist/injected.js', 'utf8')+'\n//# sourceURL='+url+'\n';
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
    }),
    //search
    rawInterceptStream.filter(function(detail){
      return detail.type === 'sendingSearchRequest';
    })
  );

  return {
    xhrInterceptStream: interceptStream,
    threadMetadataOracle: threadMetadataOracle
  };
}

module.exports = makeXhrInterceptor;
