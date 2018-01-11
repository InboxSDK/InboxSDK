/* @flow */

import {defn} from 'ud';
import {extractThreads} from '../dom-driver/gmail/gmail-response-processor';
import {extractThreadsFromSearchResponse} from '../dom-driver/gmail/gmail-sync-response-processor';
import gmailAjax from './gmailAjax';
import type {Driver} from '../driver-interfaces/driver';

async function getGmailThreadIdForRfcMessageId(driver: Driver, rfcMessageId: string): Promise<string> {
  if((driver.getPageCommunicator(): any).isUsingSyncAPI()){
    return forSyncAPI(driver, rfcMessageId);
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

async function forSyncAPI(driver: Driver, rfcMessageId: string): Promise<string> {
  const accountParamMatch = document.location.pathname.match(/(\/u\/\d+)\//i);
  const accountParam = accountParamMatch ? accountParamMatch[1] : '';

  const {text} = await gmailAjax({
    method: 'POST',
    url: `https://mail.google.com/sync${accountParam}/i/bv`,
    headers: {
      'Content-Type': 'application/json',
      'X-Framework-Xsrf-Token': await driver.getPageCommunicator().getXsrfToken(),
      'X-Gmail-BTAI': await driver.getPageCommunicator().getBtaiHeader(),
      'X-Google-BTD': '1'
    },
    data: JSON.stringify({
      '1': {
        '4':"rfc822msgid:" + rfcMessageId,
        '6':"itemlist-$ea-8"
      }
    })
  });

  const threadDescriptors = extractThreadsFromSearchResponse(text);
  return threadDescriptors[0].oldGmailThreadId;
}

export default defn(module, getGmailThreadIdForRfcMessageId);
