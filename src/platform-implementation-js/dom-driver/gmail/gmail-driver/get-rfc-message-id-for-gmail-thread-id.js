/* @flow */

import {defn} from 'ud';
import gmailLimitedAjax from '../gmail-limited-ajax';
import type GmailDriver from '../gmail-driver';
import htmlToText from '../../../../common/html-to-text';
import querystring from 'querystring';
import * as GmailResponseProcessor from '../gmail-response-processor';

async function getRfcMessageIdForGmailThreadId(driver: GmailDriver, gmailThreadId: string): Promise<string> {
  const messageIdQuery = {
    ui: 2,
    ik: driver.getPageCommunicator().getIkValue(),
    view: 'cv',
    th: gmailThreadId,
    nsc: 1,
    mb: 0,
    rt: 'j',
    search: 'all'
  };

  const gmailMessageIdResponse = await gmailLimitedAjax({
    method: 'POST',
    url: (document.location:any).origin + document.location.pathname + '?' + querystring.stringify(messageIdQuery),
    canRetry: true,
  });

  const extractedIds = GmailResponseProcessor.extractMessageIdsFromThreadBatchRequest(gmailMessageIdResponse.text);

  if (Object.keys(extractedIds).length !== 1) {
    throw new Error(`Expected to find 1 thread/message ID pair, but got ${Object.keys(extractedIds).length}`);
  }

  const gmailMessageId = extractedIds[gmailThreadId];
  if (!gmailMessageId) {
    throw new Error('Could not find a message ID for given thread ID');
  }

  const response = await gmailLimitedAjax({
    method: 'GET',
    url: (document.location:any).origin+document.location.pathname,
    canRetry: true,
    data: {
      ik: driver.getPageCommunicator().getIkValue(),
      view: 'om',
      th: gmailMessageId
    }
  });

  const match = response.text.match(/^Message-ID:\s+(\S+)\s*$/im);
  if (!match) {
    throw new Error("Failed to find rfc id for gmail thread id. Message may not exist in user's account.");
  }
  return htmlToText(match[1]);
}

export default defn(module, getRfcMessageIdForGmailThreadId);
