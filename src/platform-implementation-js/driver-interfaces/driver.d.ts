import type GmailDriver from '../dom-driver/gmail/gmail-driver';

// TODO fill in some of these any types

/**
 * An alias for GmailDriver. There previously was a distinction between the two,
 * but since Inbox is no longer supported, this is exists for compatibility's sake.
 */
export type Driver = GmailDriver;

export interface ButterBarMessage {
  destroy(): void;
}
