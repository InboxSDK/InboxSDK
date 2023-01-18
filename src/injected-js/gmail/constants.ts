import { Contact } from '../../platform-implementation-js/driver-interfaces/compose-view-driver';

export type ComposeRequestType = 'FIRST_DRAFT_SAVE' | 'DRAFT_SAVE' | 'SEND';

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
export const DRAFT_SAVING_ACTIONS = ['^r', '^r_bt'];
