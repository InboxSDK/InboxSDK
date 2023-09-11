import gmailAjax from '../../../driver-common/gmailAjax';
import { extractThreadsFromThreadResponse } from '../gmail-sync-response-processor';
import getAccountUrlPart from '../../../driver-common/getAccountUrlPart';
import type GmailDriver from '../gmail-driver';
import type { SyncThread } from '../gmail-sync-response-processor';
export default async function getThreadFromSyncThreadId(
  driver: GmailDriver,
  syncThreadId: string,
): Promise<SyncThread | null | undefined> {
  const [btaiHeader, xsrfToken] = await Promise.all([
    driver.getPageCommunicator().getBtaiHeader(),
    driver.getPageCommunicator().getXsrfToken(),
  ]);
  return getThreadFromSyncThreadIdUsingHeaders(
    syncThreadId,
    btaiHeader,
    xsrfToken,
  );
}
export async function getThreadFromSyncThreadIdUsingHeaders(
  syncThreadId: string,
  btaiHeader: string,
  xsrfToken: string,
): Promise<SyncThread | null | undefined> {
  let responseText = null;

  try {
    const { text } = await gmailAjax({
      method: 'POST',
      url: `https://mail.google.com/sync${getAccountUrlPart()}/i/fd`,
      headers: {
        'Content-Type': 'application/json',
        'X-Framework-Xsrf-Token': xsrfToken,
        'X-Gmail-BTAI': btaiHeader,
        'X-Google-BTD': '1',
      },
      data: JSON.stringify({
        '1': [
          {
            '1': syncThreadId,
            '2': 1,
          },
        ],
      }),
    });
    responseText = text;
  } catch (err) {
    // try sending request with new format 2022_09_09
    const { text } = await gmailAjax({
      method: 'POST',
      url: `https://mail.google.com/sync${getAccountUrlPart()}/i/fd?rt=r&pt=ji`,
      headers: {
        'Content-Type': 'application/json',
        'X-Framework-Xsrf-Token': xsrfToken,
        'X-Gmail-BTAI': btaiHeader,
        'X-Google-BTD': '1',
      },
      data: JSON.stringify([[[syncThreadId, 1]], 2]),
    });
    responseText = text;
  }

  const threadDescriptors = extractThreadsFromThreadResponse(responseText);

  if (threadDescriptors.length > 0) {
    const thread = threadDescriptors[0] as any;

    if (thread.oldGmailThreadID) {
      return thread;
    }
  }

  return null;
}
