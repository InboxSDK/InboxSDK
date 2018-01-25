/* @flow */

import {defn} from 'ud';
import {extractThreads} from '../dom-driver/gmail/gmail-response-processor';
import {extractThreadsFromSearchResponse} from '../dom-driver/gmail/gmail-sync-response-processor';
import gmailAjax from './gmailAjax';
import type {Driver} from '../driver-interfaces/driver';

import type {SyncThread} from '../dom-driver/gmail/gmail-sync-response-processor';

async function getSyncThreadsForSearch(driver: Driver, searchTerm: string): Promise<SyncThread[]> {
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
        '2': 1,
        '4':searchTerm
      }
    })
  });

  return extractThreadsFromSearchResponse(text);
}

export default defn(module, getSyncThreadsForSearch);
