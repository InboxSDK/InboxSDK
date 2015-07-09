/* @flow */
//jshint ignore:start

import _ from 'lodash';
import * as GmailResponseProcessor from '../../platform-implementation-js/dom-driver/gmail/gmail-response-processor';
import {parse} from 'querystring';
import logError from '../log-error';
import * as threadRowParser from './thread-row-parser';
import clickAndGetPopupUrl from './click-and-get-popup-url';
import Marker from '../../common/marker';

export function setup() {
  processPreloadedThreads();

  document.addEventListener('inboxSDKtellMeThisThreadId', function(event) {
    var threadId = getGmailThreadIdForThreadRow(event.target);
    if (threadId) {
      event.target.setAttribute('data-inboxsdk-threadid', threadId);
    }
  });
}

export function processThreadListResponse(threadListResponse: string) {
  GmailResponseProcessor.extractThreads(threadListResponse).forEach(thread => {
    storeThreadMetadata(thread);
  });
}

var AMBIGUOUS = Marker('ABIGUOUS');
var threadIdsByKey = {};
function storeThreadMetadata(threadMetadata: GmailResponseProcessor.Thread) {
  var key = threadMetadataKey(threadMetadata);
  if (_.has(threadIdsByKey, [key])) {
    if (threadIdsByKey[key] !== threadMetadata.gmailThreadId) {
      threadIdsByKey[key] = AMBIGUOUS;
    }
  } else {
    threadIdsByKey[key] = threadMetadata.gmailThreadId;
  }
}

function threadMetadataKey(threadRowMetadata: threadRowParser.ThreadRowMetadata): string {
  return threadRowMetadata.subject.trim()+':'+threadRowMetadata.timeString.trim()+':'+threadRowMetadata.peopleHtml.trim();
}

function processPreloadedThreads() {
  var preloadScript = _.find(document.querySelectorAll('script:not([src])'), function(script) {
    return script.text && script.text.slice(0,100).indexOf('var VIEW_DATA=[[') > -1;
  });
  if (!preloadScript) {
    logError(new Error("Could not read preloaded VIEW_DATA"));
  } else {
    processThreadListResponse(preloadScript.text);
  }
}

function getThreadIdFromUrl(url: string): ?string {
  var tid = parse(url).th;
  if (!tid) {
    // Draft URLs have the thread id after the hash
    var urlHashMatch = url.match(/#(.*)/);
    if (urlHashMatch) {
      url = decodeURIComponent(decodeURIComponent(urlHashMatch[1]));
      tid = parse(url).th;
    }
  }
  return tid;
}

function getGmailThreadIdForThreadRow(threadRow: HTMLElement): ?string {
  var domRowMetadata = threadRowParser.extractMetadataFromThreadRow(threadRow);
  var key = threadMetadataKey(domRowMetadata);
  if (_.has(threadIdsByKey, [key]) && threadIdsByKey[key] !== AMBIGUOUS) {
    return threadIdsByKey[key];
  }

  // Simulate a ctrl-click on the thread row to get the thread id, then
  // simulate a ctrl-click on the previously selected thread row (or the
  // first thread row) to put the cursor back where it was.
  var parent = threadRow.parentElement;
  if (!parent) {
    throw new Error("Can't operate on disconnected thread row");
  }
  var currentRowSelection = parent.querySelector('td.PE') || parent.querySelector('tr');
  var url = clickAndGetPopupUrl(threadRow);
  var threadId = url && getThreadIdFromUrl(url);
  if (threadId && !_.has(threadIdsByKey, [key])) {
    threadIdsByKey[key] = threadId;
  }
  if (currentRowSelection) {
    clickAndGetPopupUrl(currentRowSelection);
  }
  return threadId;
}
