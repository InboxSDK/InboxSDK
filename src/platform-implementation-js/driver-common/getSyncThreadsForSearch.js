/* @flow */

import {defn} from 'ud';
import {extractThreads} from '../dom-driver/gmail/gmail-response-processor';
import {extractThreadsFromSearchResponse} from '../dom-driver/gmail/gmail-sync-response-processor';
import gmailAjax from './gmailAjax';
import getAccountUrlPart from './getAccountUrlPart';
import type {Driver} from '../driver-interfaces/driver';

import type {SyncThread} from '../dom-driver/gmail/gmail-sync-response-processor';

async function getSyncThreadsForSearch(driver: Driver, searchTerm: string): Promise<SyncThread[]> {
  const {text} = await gmailAjax({
    method: 'POST',
    url: `https://mail.google.com/sync${getAccountUrlPart()}/i/bv`,
    headers: {
      'Content-Type': 'application/json',
      'X-Framework-Xsrf-Token': await driver.getPageCommunicator().getXsrfToken(),
      'X-Gmail-BTAI': await driver.getPageCommunicator().getBtaiHeader(),
      'X-Google-BTD': '1'
    },
    data: JSON.stringify({
      '1': {
        '2': 1,
        '4':searchTerm
      }
    })
  });

  return extractThreadsFromSearchResponse(text);
}

export default defn(module, getSyncThreadsForSearch);
