/* @flow */

import find from 'lodash/find';
import * as GmailResponseProcessor from '../../../platform-implementation-js/dom-driver/gmail/gmail-response-processor';
import {parse} from 'querystring';
import * as logger from '../../injected-logger';
import * as threadRowParser from './thread-row-parser';
import clickAndGetPopupUrl from './click-and-get-popup-url';
import Marker from '../../../common/marker';
import findParent from '../../../common/find-parent';

export function setup() {
  processPreloadedThreads();

  document.addEventListener('inboxSDKtellMeThisThreadIdByDatabase', function(event:any) {
    const threadId = getGmailThreadIdForThreadRowByDatabase(event.target);
    if (threadId) {
      event.target.setAttribute('data-inboxsdk-threadid', threadId);
    }
  });

  document.addEventListener('inboxSDKtellMeThisThreadIdByClick', function(event:any) {
    const threadId = getGmailThreadIdForThreadRowByClick(event.target);
    if (threadId) {
      event.target.setAttribute('data-inboxsdk-threadid', threadId);
    }
  });
}

export function processThreadListResponse(threadListResponse: string) {
  processThreads(GmailResponseProcessor.extractThreads(threadListResponse));
}

function processThreads(threads: GmailResponseProcessor.Thread[]) {
  threads.forEach(storeThreadMetadata);
}

var AMBIGUOUS = Marker('AMBIGUOUS');
var threadIdsByKey: Map<string, string|Marker> = new Map();
function storeThreadMetadata(threadMetadata: GmailResponseProcessor.Thread) {
  var key = threadMetadataKey(threadMetadata);
  if (threadIdsByKey.has(key)) {
    if (threadIdsByKey.get(key) !== threadMetadata.gmailThreadId) {
      threadIdsByKey.set(key, AMBIGUOUS);
    }
  } else {
    threadIdsByKey.set(key, threadMetadata.gmailThreadId);
  }
}

function threadMetadataKey(threadRowMetadata: threadRowParser.ThreadRowMetadata): string {
  return threadRowMetadata.subject.trim()+':'+threadRowMetadata.timeString.trim()+':'+threadRowMetadata.peopleHtml.trim();
}

function processPreloadedThreads() {
  const preloadScript = find(document.querySelectorAll('script:not([src])'), script =>
    script.text && script.text.slice(0,100).indexOf('var VIEW_DATA=[[') > -1
  );
  if (!preloadScript) {
    logger.error(new Error("Could not read preloaded VIEW_DATA"));
  } else {
    const firstBracket = preloadScript.text.indexOf('[');
    const lastBracket = preloadScript.text.lastIndexOf(']');
    const viewDataString = preloadScript.text.slice(firstBracket, lastBracket+1);
    processThreads(
      GmailResponseProcessor.extractThreadsFromDeserialized(
        [GmailResponseProcessor.deserializeArray(viewDataString)]
      )
    );
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

function getGmailThreadIdForThreadRowByDatabase(threadRow: HTMLElement): ?string {
  const domRowMetadata = threadRowParser.extractMetadataFromThreadRow(threadRow);
  const key = threadMetadataKey(domRowMetadata);
  const value = threadIdsByKey.get(key);
  if (typeof value === 'string') {
    return value;
  }
}

function getGmailThreadIdForThreadRowByClick(threadRow: HTMLElement): ?string {
  // Simulate a ctrl-click on the thread row to get the thread id, then
  // simulate a ctrl-click on the previously selected thread row (or the
  // first thread row) to put the cursor back where it was.
  const domRowMetadata = threadRowParser.extractMetadataFromThreadRow(threadRow);
  const parent = findParent(threadRow, el => el.nodeName === 'DIV' && el.getAttribute('role') === 'main');
  if (!parent) {
    throw new Error("Can't operate on disconnected thread row");
  }
  const currentRowSelection = parent.querySelector('td.PE') || parent.querySelector('tr');
  const url = clickAndGetPopupUrl(threadRow);
  const threadId = url && getThreadIdFromUrl(url);
  if (currentRowSelection) {
    clickAndGetPopupUrl(currentRowSelection);
  }
  return threadId;
}
