/* @flow */

import {defn} from 'ud';
import BigNumber from 'bignumber.js';

import gmailAjax from '../../../driver-common/gmailAjax';

import {extractThreadsFromThreadResponse} from '../gmail-sync-response-processor';

import type GmailDriver from '../gmail-driver';

export default async function getOldGmailThreadIdFromSyncThreadId(driver: GmailDriver, syncThreadId: string): Promise<string> {

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
  return threadDescriptors[0].oldGmailThreadId;
}
