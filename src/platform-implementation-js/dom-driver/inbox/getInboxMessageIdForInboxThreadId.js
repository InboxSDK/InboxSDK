/* @flow */

import {defn} from 'ud';
import googleLimitedAjax from '../../driver-common/googleLimitedAjax';
import {extractMessageIdsFromThreadResponse} from './inboxResponseProcessor';

import type InboxDriver from './inbox-driver';

async function getInboxMessageIdForInboxThreadId(driver: InboxDriver, inboxThreadId: string): Promise<string> {
  const accountParamMatch = document.location.pathname.match(/(\/u\/\d+)\//i);
  const accountParam = accountParamMatch ? accountParamMatch[1] : '';

  const {text} = await googleLimitedAjax({
    method: 'POST',
    url: `https://inbox.google.com/sync${accountParam}/i/fd`,
    headers: {
      'Content-Type': 'application/json',
      'X-Framework-Xsrf-Token': driver.getPageCommunicator().getXsrfToken(),
      'X-Gmail-BTAI': '{"3":{"6":0,"10":1,"11":0,"13":0,"15":0,"16":0,"17":0,"18":0,"19":0,"20":0,"21":0,"22":0,"23":0,"24":0,"25":0,"26":0},"5":"980401df73","7":7,"8":"gmail_bigtop_web_170709.24_p1","9":6,"10":5,"11":"","12":-25200000,"13":"America/Los_Angeles","14":1,"16":161345177,"17":""}',
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
