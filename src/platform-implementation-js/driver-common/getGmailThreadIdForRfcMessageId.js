/* @flow */

import {defn} from 'ud';
import {extractThreads} from '../dom-driver/gmail/gmail-response-processor';
import getSyncThreadsForSearch from './getSyncThreadsForSearch';
import gmailAjax from './gmailAjax';
import type {Driver} from '../driver-interfaces/driver';

async function getGmailThreadIdForRfcMessageId(driver: Driver, rfcMessageId: string): Promise<string> {
  if((driver:any).isUsingSyncAPI && (driver:any).isUsingSyncAPI()){
    const threadDescriptors = await getSyncThreadsForSearch(driver, 'rfc822msgid:' + rfcMessageId);
    return threadDescriptors[0].oldGmailThreadID;
  }
  else {
    return forOldAPI(driver, rfcMessageId);
  }
}

async function forOldAPI(driver: Driver, rfcMessageId: string): Promise<string> {
  const accountParamMatch = document.location.pathname.match(/(\/u\/\d+)\//i);
  // Inbox omits the account param if there is only one logged in account,
  // but this page is backed by Gmail's backend which will always include it.
  const accountParam = accountParamMatch ? accountParamMatch[1] : '/u/0';

  const response = await gmailAjax({
    method: 'POST',
    url: `https://mail.google.com/mail${accountParam}/`,
    data: {
      ik: driver.getPageCommunicator().getIkValue(),
      at: await driver.getGmailActionToken(),
      ui: '2',
      view: 'tl',
      start: '0',
      num: '1',
      rt: 'c',
      search: 'query',
      q: `rfc822msgid:${rfcMessageId}`,
    },
    xhrFields: {
      withCredentials: true
    },
    canRetry: true,
    headers: {
      "content-type": 'application/x-www-form-urlencoded;charset=UTF-8'
    }
  });

  const threads = extractThreads(response.text);
  if (threads.length !== 1) {
    throw new Error("Failed to find gmail thread id for rfc message id. Message may not exist in user's account.");
  }
  return threads[0].gmailThreadId;
}

export default defn(module, getGmailThreadIdForRfcMessageId);
