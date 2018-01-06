/* @flow */

import {defn} from 'ud';
import inboxAjax from '../../driver-common/inboxAjax';
import {extractMessageIdsFromThreadResponse} from './inboxResponseProcessor';

import type InboxDriver from './inbox-driver';

async function getInboxMessageIdForInboxThreadId(driver: InboxDriver, inboxThreadId: string): Promise<string> {
  const accountParamMatch = document.location.pathname.match(/(\/u\/\d+)\//i);
  const accountParam = accountParamMatch ? accountParamMatch[1] : '';

  const {text} = await inboxAjax({
    method: 'POST',
    url: `https://inbox.google.com/sync${accountParam}/i/fd`,
    headers: {
      'Content-Type': 'application/json',
      'X-Framework-Xsrf-Token': await driver.getPageCommunicator().getXsrfToken(),
      'X-Gmail-BTAI': await driver.getPageCommunicator().getBtaiHeader(),
      'X-Google-BTD': '1'
    },
    data: JSON.stringify({
      '1': [{
        '1': inboxThreadId,
        '3': []
      }]
    })
  });

  const [firstMessageId] = extractMessageIdsFromThreadResponse(text);
  if (!firstMessageId) throw new Error('Failed to find inbox message ID for thread');

  return firstMessageId;
}

export default defn(module, getInboxMessageIdForInboxThreadId);
