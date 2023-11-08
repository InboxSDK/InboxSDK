import { defn } from 'ud';
import getSyncThreadsForSearch from './getSyncThreadsForSearch';
import type { Driver } from '../driver-interfaces/driver';

async function getGmailThreadIdForRfcMessageId(
  driver: Driver,
  rfcMessageId: string,
): Promise<string> {
  const { threads: threadDescriptors } = await getSyncThreadsForSearch(
    driver,
    'rfc822msgid:' + rfcMessageId,
  );
  return threadDescriptors[0].oldGmailThreadID;
}

export default defn(module, getGmailThreadIdForRfcMessageId);
