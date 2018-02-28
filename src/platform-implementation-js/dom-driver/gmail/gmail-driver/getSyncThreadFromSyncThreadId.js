/* @flow */

import {defn} from 'ud';
import BigNumber from 'bignumber.js';

import gmailAjax from '../../../driver-common/gmailAjax';

import {extractThreadsFromThreadResponse} from '../gmail-sync-response-processor';

import type GmailDriver from '../gmail-driver';

import type {SyncThread} from '../gmail-sync-response-processor';

export default async function getThreadFromSyncThreadId(driver: GmailDriver, syncThreadId: string): Promise<SyncThread> {

  const accountParamMatch = document.location.pathname.match(/(\/u\/\d+)\//i);
  const accountParam = accountParamMatch ? accountParamMatch[1] : '';

  const {text} = await gmailAjax({
    method: 'POST',
    url: `https://mail.google.com/sync${accountParam}/i/fd`,
    headers: {
      'Content-Type': 'application/json',
      'X-Framework-Xsrf-Token': await driver.getPageCommunicator().getXsrfToken(),
      'X-Gmail-BTAI': await driver.getPageCommunicator().getBtaiHeader(),
      'X-Google-BTD': '1'
    },
    data: JSON.stringify({
      '1': [
        {
          '1': syncThreadId,
          '2': 1
        }
      ]
    })
  });

  const threadDescriptors = extractThreadsFromThreadResponse(text);
  if(threadDescriptors.length > 0) {
    const thread = threadDescriptors[0];
    if(thread.oldGmailThreadID) return (thread: any);
  }

  throw new Error('thread not available');
}
