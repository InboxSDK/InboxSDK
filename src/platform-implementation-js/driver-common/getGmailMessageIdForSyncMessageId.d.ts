import { Driver } from '../driver-interfaces/driver';

export default function getGmailMessageIdForSyncMessageId(
  driver: Driver,
  syncMessageID: string
): Promise<string>;
