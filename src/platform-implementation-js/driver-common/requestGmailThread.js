/* @flow */

import {defn} from 'ud';
import querystring from 'querystring';
import gmailAjax from './gmailAjax';

async function requestGmailThread(ikValue: string, threadId: string): Promise<string> {
  const accountParamMatch = document.location.pathname.match(/(\/u\/\d+)\//i);
  // Inbox omits the account param if there is only one logged in account,
  // but this page is backed by Gmail's backend which will always include it.
  const accountParam = accountParamMatch ? accountParamMatch[1] : '/u/0';

  const queryParameters = {
    ui: 2,
    ik: ikValue,
    view: 'cv',
    th: threadId,
    pcd: 1,
    mb: 0,
    rt: 'c',
    search: 'inbox',
    type: threadId
  };

  const {text} = await gmailAjax({
    method: 'POST',
    url: `https://mail.google.com/mail${accountParam}?${querystring.stringify(queryParameters)}`,
    canRetry: true
  });

  return text;
}

export default defn(module, requestGmailThread);
