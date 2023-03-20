import GmailDriver from '../gmail-driver';
import type { SyncThread } from '../gmail-sync-response-processor';

export default function getThreadFromSyncThreadId(
  driver: GmailDriver,
  syncThreadId: string
): Promise<SyncThread | null | undefined>;
