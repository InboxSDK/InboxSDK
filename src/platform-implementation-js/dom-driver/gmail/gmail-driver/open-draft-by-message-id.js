/* @flow */

import qs from 'querystring';
import type GmailDriver from '../gmail-driver';

export default function openDraftByMessageID(driver: GmailDriver, messageID: string) {
  window.location.hash = makeNewHash(window.location.hash, messageID);
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
