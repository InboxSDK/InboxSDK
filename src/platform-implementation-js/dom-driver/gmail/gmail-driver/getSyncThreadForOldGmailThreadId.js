/* @flow */

import {defn} from 'ud';
import BigNumber from 'bignumber.js';

import getSyncThreadsForSearch from '../../../driver-common/getSyncThreadsForSearch';

import gmailAjax from '../../../driver-common/gmailAjax';

import {extractThreadsFromSearchResponse} from '../gmail-sync-response-processor';

import type GmailDriver from '../gmail-driver';
import type {SyncThread} from '../gmail-sync-response-processor';

export default async function getSyncThreadForOldGmailThreadId(driver: GmailDriver, oldGmailThreadId: string): Promise<SyncThread> {
  const threadDescriptors = await getSyncThreadsForSearch(driver, 'threadid:' + new BigNumber(oldGmailThreadId, 16).toString(10));
  return threadDescriptors[0];
}
