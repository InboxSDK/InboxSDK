/* @flow */

import {defn} from 'ud';
import querystring from 'querystring';
import gmailAjax from './gmailAjax';
import getAccountUrlPart from './getAccountUrlPart';

async function requestGmailThread(ikValue: string, threadId: string): Promise<string> {
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
    url: `https://mail.google.com/mail${getAccountUrlPart()}?${querystring.stringify(queryParameters)}`,
    canRetry: true
  });

  return text;
}

export default defn(module, requestGmailThread);
