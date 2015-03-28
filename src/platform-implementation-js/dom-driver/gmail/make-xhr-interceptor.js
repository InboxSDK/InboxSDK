var _ = require('lodash');
var Bacon = require('baconjs');
var fs = require('fs');
var deparam = require('querystring').parse;
var PageCommunicator = require('./page-communicator');

import injectScript from '../../lib/inject-script';

function makeXhrInterceptor() {
  var pageCommunicator = new PageCommunicator();
  var rawInterceptStream = pageCommunicator.ajaxInterceptStream;

  const pageCommunicatorPromise = injectScript().then(() => pageCommunicator);

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

  return {
    xhrInterceptStream: interceptStream,
    pageCommunicatorPromise
  };
}

module.exports = makeXhrInterceptor;
