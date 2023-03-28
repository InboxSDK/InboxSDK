/* @flow */

import BigNumber from 'bignumber.js';

import getSyncThreadsForSearch from '../../../driver-common/getSyncThreadsForSearch';

import isStreakAppId from '../../../lib/isStreakAppId';

import type GmailDriver from '../gmail-driver';
import type { SyncThread } from '../gmail-sync-response-processor';

export default async function getSyncThreadForOldGmailThreadId(
  driver: GmailDriver,
  oldGmailThreadId: string
): Promise<SyncThread> {
  const { threads: threadDescriptors, _text } = await getSyncThreadsForSearch(
    driver,
    'threadid:' + new BigNumber(oldGmailThreadId, 16).toString(10)
  );
  const firstThread = threadDescriptors[0];
  if (firstThread == null) {
    console.error(`Thread with ID ${oldGmailThreadId} not found by Gmail`);
    const isStreak = isStreakAppId(driver.getAppId());
    const err = new Error(
      'Thread not found by getSyncThreadForOldGmailThreadId'
    );
    driver.getLogger().error(err, {
      oldGmailThreadId: isStreak ? oldGmailThreadId : null,
      responseText: isStreak ? _text : null,
    });
    throw err;
  }
  return firstThread;
}
