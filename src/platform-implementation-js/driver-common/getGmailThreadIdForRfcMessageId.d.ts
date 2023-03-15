import { Driver } from '../driver-interfaces/driver';

export default function getGmailThreadIdForRfcMessageId(
  driver: Driver,
  rfcMessageId: string
): Promise<string>;
