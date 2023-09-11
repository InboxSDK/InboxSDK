import find from 'lodash/find';
import * as GmailResponseProcessor from '../../../platform-implementation-js/dom-driver/gmail/gmail-response-processor';
import { parse } from 'querystring';
import * as logger from '../../injected-logger';
import * as threadRowParser from './thread-row-parser';
import clickAndGetPopupUrl from './click-and-get-popup-url';
import findParent from '../../../common/find-parent';
import { CustomDomEvent } from '../../../platform-implementation-js/lib/dom/custom-events';

export function setup() {
  try {
    processPreloadedThreads();
  } catch (err) {
    logger.error(err, 'Failed to process preloaded thread identifiers');
  }

  document.addEventListener(
    CustomDomEvent.tellMeThisThreadIdByDatabase,
    function (event) {
      try {
        if (!(event.target instanceof HTMLElement)) {
          throw new Error('event.target is not an HTMLElement');
        }
        const threadId = getGmailThreadIdForThreadRowByDatabase(event.target);

        if (threadId) {
          event.target.setAttribute('data-inboxsdk-threadid', threadId);
        }
      } catch (err) {
        logger.error(err, 'Error in inboxSDKtellMeThisThreadIdByDatabase');
      }
    },
  );
  document.addEventListener(
    CustomDomEvent.tellMeThisThreadIdByClick,
    function (event) {
      try {
        if (!(event.target instanceof HTMLElement)) {
          throw new Error('event.target is not an HTMLElement');
        }

        const threadId = getGmailThreadIdForThreadRowByClick(event.target);

        if (threadId) {
          event.target.setAttribute('data-inboxsdk-threadid', threadId);
        }
      } catch (err) {
        logger.error(err, 'Error in inboxSDKtellMeThisThreadIdByClick');
      }
    },
  );
}
export function processThreadListResponse(threadListResponse: string) {
  processThreads(GmailResponseProcessor.extractThreads(threadListResponse));
}

function processThreads(threads: GmailResponseProcessor.Thread[]) {
  threads.forEach(storeThreadMetadata);
}

type AmbiguousMarker = {
  name: 'AMBIGUOUS';
};
const AMBIGUOUS: AmbiguousMarker = {
  name: 'AMBIGUOUS',
};
const threadIdsByKey: Map<string, string | AmbiguousMarker> = new Map();

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

function threadMetadataKey(
  threadRowMetadata: threadRowParser.ThreadRowMetadata,
): string {
  return (
    threadRowMetadata.subject.trim() +
    ':' +
    threadRowMetadata.timeString.trim() +
    ':' +
    threadRowMetadata.peopleHtml.trim()
  );
}

function processPreloadedThreads() {
  const preloadScript = find(
    document.querySelectorAll<HTMLScriptElement>('script:not([src])'),
    (script) =>
      script.text && script.text.slice(0, 500).indexOf('var VIEW_DATA=[[') > -1,
  ) as HTMLScriptElement | undefined;

  if (!preloadScript) {
    // preloadScript is not available in gmail v2, so let's stop logging an error
    return;
  } else {
    const firstBracket = preloadScript.text.indexOf('[');
    const lastBracket = preloadScript.text.lastIndexOf(']');
    const viewDataString = preloadScript.text.slice(
      firstBracket,
      lastBracket + 1,
    );
    processThreads(
      GmailResponseProcessor.extractThreadsFromDeserialized([
        GmailResponseProcessor.deserializeArray(viewDataString),
      ]),
    );
  }
}

function getThreadIdFromUrl(url: string): string | null | undefined {
  var tid = parse(url).th;

  if (!tid) {
    // drafts in sync world can have weird urls that kind of
    // look like old style urls, and get handled properly here
    var urlHashMatch = url.match(/#(.*)/);

    if (urlHashMatch) {
      // drafts have the hash in them without the th=
      url = decodeURIComponent(decodeURIComponent(urlHashMatch[1]));
      tid = parse(url).th;
    }
  }

  // if we're in sync world and it's a
  // draft then a hash can come through in the beginning
  return (tid as string)!.replace('#', '');
}

function getGmailThreadIdForThreadRowByDatabase(
  threadRow: HTMLElement,
): string | null | undefined {
  const domRowMetadata =
    threadRowParser.extractMetadataFromThreadRow(threadRow);

  if (domRowMetadata === threadRowParser.ThreadRowAd) {
    // TODO do we want to do anything here?
    return;
  }

  const key = threadMetadataKey(domRowMetadata);
  const value = threadIdsByKey.get(key);

  if (typeof value === 'string') {
    return value;
  }
}

function getGmailThreadIdForThreadRowByClick(
  threadRow: HTMLElement,
): string | null | undefined {
  // Simulate a ctrl-click on the thread row to get the thread id, then
  // simulate a ctrl-click on the previously selected thread row (or the
  // first thread row) to put the cursor back where it was.
  threadRowParser.extractMetadataFromThreadRow(threadRow);
  const parent = findParent(
    threadRow,
    (el) => el.nodeName === 'DIV' && el.getAttribute('role') === 'main',
  );

  if (!parent) {
    throw new Error("Can't operate on disconnected thread row");
  }

  const currentRowSelection =
    parent.querySelector<HTMLElement>('td.PE') ||
    parent.querySelector<HTMLElement>('tr');
  const url = clickAndGetPopupUrl(threadRow);
  const threadId = url && getThreadIdFromUrl(url);

  if (currentRowSelection) {
    clickAndGetPopupUrl(currentRowSelection);
  }

  return threadId;
}
