import { Contact } from '../../inboxsdk';

export type ComposeRequestType = 'FIRST_DRAFT_SAVE' | 'DRAFT_SAVE' | 'SEND' | 'SCHEDULE';

export type ComposeRequest = {
  draftID: string;
  to: Contact[] | null;
  cc: Contact[] | null;
  bcc: Contact[] | null;
  body: string;
  subject: string;
  type: ComposeRequestType;
};

export const SEND_ACTIONS = ['^pfg'];
export const SCHEDULE_ACTIONS = ['^scheduled'];
export const DRAFT_SAVING_ACTIONS = ['^r', '^r_bt'];
