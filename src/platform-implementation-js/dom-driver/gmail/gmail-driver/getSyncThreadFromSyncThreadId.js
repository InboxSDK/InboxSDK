/* @flow */

import {defn} from 'ud';
import gmailAjax from '../../../driver-common/gmailAjax';
import {extractThreadsFromThreadResponse} from '../gmail-sync-response-processor';
import getAccountUrlPart from '../../../driver-common/getAccountUrlPart';
import type GmailDriver from '../gmail-driver';
import type {SyncThread} from '../gmail-sync-response-processor';

export default async function getThreadFromSyncThreadId(
  driver: GmailDriver, syncThreadId: string
): Promise<?SyncThread> {
  const [btaiHeader, xsrfToken] = await Promise.all([
    driver.getPageCommunicator().getBtaiHeader(), driver.getPageCommunicator().getXsrfToken()
  ]);
  return getThreadFromSyncThreadIdUsingHeaders(syncThreadId, btaiHeader, xsrfToken);
}

export async function getThreadFromSyncThreadIdUsingHeaders(
  syncThreadId: string, btaiHeader: string, xsrfToken: string
): Promise<?SyncThread> {
  const {text} = await gmailAjax({
    method: 'POST',
    url: `https://mail.google.com/sync${getAccountUrlPart()}/i/fd`,
    headers: {
      'Content-Type': 'application/json',
      'X-Framework-Xsrf-Token': xsrfToken,
      'X-Gmail-BTAI': btaiHeader,
      'X-Google-BTD': '1'
    },
    data: JSON.stringify({
      '1': [
        {
          '1': syncThreadId,
          '2': 1
        }
      ]
    })
  });

  const threadDescriptors = extractThreadsFromThreadResponse(text);
  if(threadDescriptors.length > 0) {
    const thread = threadDescriptors[0];
    if(thread.oldGmailThreadID) {
      return thread;
    }
  }

  return null;
}
