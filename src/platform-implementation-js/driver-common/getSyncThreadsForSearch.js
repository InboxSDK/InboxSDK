/* @flow */

import { defn } from 'ud';
import { extractThreads } from '../dom-driver/gmail/gmail-response-processor';
import { extractThreadsFromSearchResponse } from '../dom-driver/gmail/gmail-sync-response-processor';
import gmailAjax from './gmailAjax';
import getAccountUrlPart from './getAccountUrlPart';
import type { Driver } from '../driver-interfaces/driver';
import isStreakAppId from '../lib/isStreakAppId';

import type { SyncThread } from '../dom-driver/gmail/gmail-sync-response-processor';

async function getSyncThreadsForSearch(
  driver: Driver,
  searchTerm: string
): Promise<SyncThread[]> {
  const { text } = await gmailAjax({
    method: 'POST',
    url: `https://mail.google.com/sync${getAccountUrlPart()}/i/bv`,
    headers: {
      'Content-Type': 'application/json',
      'X-Framework-Xsrf-Token': await driver
        .getPageCommunicator()
        .getXsrfToken(),
      'X-Gmail-BTAI': await driver.getPageCommunicator().getBtaiHeader(),
      'X-Google-BTD': '1'
    },
    data: JSON.stringify({
      '1': {
        '2': 1,
        '4': searchTerm
      }
    })
  });

  const threads = extractThreadsFromSearchResponse(text);
  if (threads.length === 0 && text.length > 0) {
    const isStreak = isStreakAppId(driver.getAppId());
    driver
      .getLogger()
      .error(new Error('Could not parse response for sync threads.'), {
        syncResponse: isStreak ? text : null
      });
  }
  return threads;
}

export default defn(module, getSyncThreadsForSearch);
