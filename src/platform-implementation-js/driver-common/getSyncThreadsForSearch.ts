import { defn } from 'ud';
import { extractThreadsFromSearchResponse } from '../dom-driver/gmail/gmail-sync-response-processor';
import gmailAjax from './gmailAjax';
import getAccountUrlPart from './getAccountUrlPart';
import { Driver } from '../driver-interfaces/driver';

import { SyncThread } from '../dom-driver/gmail/gmail-sync-response-processor';

async function getSyncThreadsForSearch(
  driver: Driver,
  searchTerm: string
): Promise<{ threads: SyncThread[]; _text: string }> {
  let responseText = null;
  try {
    const { text } = await gmailAjax({
      method: 'POST',
      url: `https://mail.google.com/sync${getAccountUrlPart()}/i/bv`,
      headers: {
        'Content-Type': 'application/json',
        'X-Framework-Xsrf-Token': await driver
          .getPageCommunicator()
          .getXsrfToken(),
        'X-Gmail-BTAI': await driver.getPageCommunicator().getBtaiHeader(),
        'X-Google-BTD': '1',
      },
      data: JSON.stringify({
        '1': {
          '2': 1,
          '4': searchTerm,
        },
      }),
    });
    responseText = text;
  } catch (err) {
    const { text } = await gmailAjax({
      method: 'POST',
      url: `https://mail.google.com/sync${getAccountUrlPart()}/i/bv?rt=r&pt=ji`,
      headers: {
        'Content-Type': 'application/json',
        'X-Framework-Xsrf-Token': await driver
          .getPageCommunicator()
          .getXsrfToken(),
        'X-Gmail-BTAI': await driver.getPageCommunicator().getBtaiHeader(),
        'X-Google-BTD': '1',
      },
      data: JSON.stringify([[null, 51, null, searchTerm]]),
    });

    responseText = text;
  }

  return {
    threads: extractThreadsFromSearchResponse(responseText),
    _text: responseText,
  };
}

export default defn(module, getSyncThreadsForSearch);
