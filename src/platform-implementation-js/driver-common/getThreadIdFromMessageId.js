/* @flow */

import {defn} from 'ud';
import requestGmailThread from './requestGmailThread';
import {extractGmailThreadIdFromMessageIdSearch} from '../dom-driver/gmail/gmail-response-processor';
import type {Driver} from '../driver-interfaces/driver';

async function getThreadIdFromMessageId(driver: Driver, messageId: string): Promise<string> {
  const ikValue = driver.getPageCommunicator().getIkValue();
  const text = await requestGmailThread(ikValue, messageId);
  const threadId = extractGmailThreadIdFromMessageIdSearch(text);
  if (!threadId) {
    throw new Error('Failed to find thread id for given message id');
  }
  return threadId;
}

export default defn(module, getThreadIdFromMessageId);
