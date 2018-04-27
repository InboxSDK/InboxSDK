/* @flow */

import qs from 'querystring';

import getRfcMessageIDForSyncMessageID from '../../../driver-common/getRfcMessageIdForSyncMessageId';
import getSyncThreadsForSearch from '../../../driver-common/getSyncThreadsForSearch';

import type GmailDriver from '../gmail-driver';

export default async function openDraftByMessageID(driver: GmailDriver, messageID: string) {
  let newHash;
  if(driver.isUsingSyncAPI()){
    const rfcMessageID = await driver.getRfcMessageIdForGmailThreadId(messageID);
    const threads = await getSyncThreadsForSearch(driver, 'rfc822msgid:' + rfcMessageID);

    if(threads.length === 0) return;

    newHash = makeNewSyncHash(window.location.hash, threads[0].syncThreadID, threads[0].extraMetaData.syncMessageData[0].syncMessageID);
  }
  else {
    newHash = makeNewHash(window.location.hash, messageID);
  }
  window.location.hash = newHash;
}

export function makeNewHash(oldHash: string, messageID: string): string {
  oldHash = '#' + oldHash.replace(/^#/, '');
  const [pre, query] = oldHash.split('?');
  const params = qs.parse(query);
  if (params.compose) {
    params.compose += ',' + messageID;
  } else {
    params.compose = messageID;
  }
  return pre + '?' + qs.stringify(params);
}

export function makeNewSyncHash(oldHash: string, syncThreadID: string, syncMessageID: string): string {
  oldHash = '#' + oldHash.replace(/^#/, '');
  const [pre, query] = oldHash.split('?');
  const params = qs.parse(query);
  params.compose = `#${syncThreadID}+#${syncMessageID}`;

  return pre + '?' + qs.stringify(params);
}
