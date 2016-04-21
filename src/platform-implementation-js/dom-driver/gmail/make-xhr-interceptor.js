/* @flow */
//jshint ignore:start

import _ from 'lodash';
import Kefir from 'kefir';
import {parse} from 'querystring';
import PageCommunicator from './gmail-page-communicator';

import injectScript from '../../lib/inject-script';

export default function makeXhrInterceptor(): {xhrInterceptStream: Kefir.Stream, pageCommunicatorPromise: Promise<PageCommunicator>} {
  var pageCommunicator = new PageCommunicator();
  var rawInterceptStream = pageCommunicator.ajaxInterceptStream;

  var pageCommunicatorPromise = injectScript().then(() => pageCommunicator);

  var interceptStream = Kefir.merge([
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
    }),
    rawInterceptStream.filter(function(detail) {
      return detail.type === 'emailDraftSaveSending';
    }).map(function(detail) {
      var body = parse(detail.body);
      return {
        type: 'emailDraftSaveSending',
        composeId: body.composeid,
        draft: body.draft
      };
    }),
    rawInterceptStream.filter(function(detail) {
      return detail.type === 'emailDraftReceived';
    }).map(function(detail) {
      var body = parse(detail.originalSendBody);
      var response = detail.responseText;
      return {
        type: 'emailDraftReceived',
        composeId: body.composeid,
        draft: body.draft,
        response: response,
        connectionDetails: detail.connectionDetails
      };
    })
  ]);

  return {
    xhrInterceptStream: interceptStream,
    pageCommunicatorPromise
  };
}
