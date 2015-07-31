/* @flow */
//jshint ignore:start

var _ = require('lodash');
var Bacon = require('baconjs');
var fs = require('fs');
import {parse} from 'querystring';
import PageCommunicator from './page-communicator';

import injectScript from '../../lib/inject-script';

export default function makeXhrInterceptor(): {xhrInterceptStream: Bacon.Observable, pageCommunicatorPromise: Promise<PageCommunicator>} {
  var pageCommunicator = new PageCommunicator();
  var rawInterceptStream = pageCommunicator.ajaxInterceptStream;

  var pageCommunicatorPromise = injectScript().then(() => pageCommunicator);

  var interceptStream = Bacon.mergeAll(
    rawInterceptStream.filter(function(detail) {
      return detail.type === 'emailSending';
    }).map(function(detail) {
      var body = parse(detail.body);
      return {
        type: 'emailSending',
        composeId: body.composeid,
        draft: body.draft
      };
    }),
    rawInterceptStream.filter(function(detail) {
      return detail.type === 'emailSent';
    }).map(function(detail) {
      var body = parse(detail.originalSendBody);
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
