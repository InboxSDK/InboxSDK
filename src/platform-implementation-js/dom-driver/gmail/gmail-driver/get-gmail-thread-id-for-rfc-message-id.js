/* @flow */
//jshint ignore:start

import RSVP from 'rsvp';
import {extractThreads} from '../gmail-response-processor';
import rateLimitedAjax from '../../../../common/rate-limited-ajax';
import type GmailDriver from '../gmail-driver';

export default function getGmailThreadIdForRfcMessageId(driver: GmailDriver, rfcMessageId: string): Promise<string> {
  var searchString = 'rfc822msgid:'+rfcMessageId;
  return rateLimitedAjax({
    method: 'POST',
    url: (document.location:any).origin+document.location.pathname,
    data: {
      ik: driver.getPageCommunicator().getIkValue(),
      at: driver.getPageCommunicator().getActionTokenValue(),
      ui: '2',
      view: 'tl',
      start: '0',
      num: '1',
      rt: 'c',
      search: 'query',
      q: searchString,
    },
    xhrFields: {
      withCredentials: true
    },
    headers: {
      "content-type": 'application/x-www-form-urlencoded;charset=UTF-8'
    }
  }).then(response => {
    var threads = extractThreads(response.text);
    if (threads.length !== 1) {
      throw new Error("Failed to find gmail thread id for rfc message id. Message may not exist in user's account.");
    }
    return threads[0].gmailThreadId;
  });
}
