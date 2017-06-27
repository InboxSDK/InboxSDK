/* @flow */

import {defn} from 'ud';
import querystring from 'querystring';
import gmailAjax from './gmailAjax';
import {extractGmailThreadIdFromMessageIdSearch} from '../dom-driver/gmail/gmail-response-processor';
import type {Driver} from '../driver-interfaces/driver';

async function getThreadIdFromMessageId(driver: Driver, messageId: string): Promise<string> {
  const accountParamMatch = document.location.pathname.match(/(\/u\/\d+)\//i);
  // Inbox omits the account param if there is only one logged in account,
  // but this page is backed by Gmail's backend which will always include it.
  const accountParam = accountParamMatch ? accountParamMatch[1] : '/u/0';

  const queryParameters = {
    ui: 2,
    ik: driver.getPageCommunicator().getIkValue(),
    view: 'cv',
    th: messageId,
    pcd: 1,
    mb: 0,
    rt: 'c',
    search: 'inbox',
    type: messageId
  };

  const {text} = await gmailAjax({
    method: 'POST',
    url: `https://mail.google.com/mail${accountParam}?${querystring.stringify(queryParameters)}`,
    canRetry: true
  });

  const threadId = extractGmailThreadIdFromMessageIdSearch(text);
  if (!threadId) {
    throw new Error('Failed to find thread id for given message id');
  }
  return threadId;
}

export default defn(module, getThreadIdFromMessageId);
