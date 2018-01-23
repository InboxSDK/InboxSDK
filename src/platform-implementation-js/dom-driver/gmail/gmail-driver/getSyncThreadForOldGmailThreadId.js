/* @flow */

import {defn} from 'ud';
import BigNumber from 'bignumber.js';

import gmailAjax from '../../../driver-common/gmailAjax';

import {extractThreadsFromSearchResponse} from '../gmail-sync-response-processor';

import type GmailDriver from '../gmail-driver';
import type {SyncThread} from '../gmail-sync-response-processor';

export default async function getSyncThreadForOldGmailThreadId(driver: GmailDriver, oldGmailThreadId: string): Promise<SyncThread> {

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
        '4':"threadid:" + new BigNumber(oldGmailThreadId, 16).toString(10),
        '6':"itemlist-$ea-8"
      }
    })
  });

  const threadDescriptors = extractThreadsFromSearchResponse(text);
  return threadDescriptors[0];
}
