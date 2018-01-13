/* @flow */

import {defn} from 'ud';
import gmailAjax from './gmailAjax';
import type {Driver} from '../driver-interfaces/driver';

// Messages sent from the local user in Inbox have a fake ID in the DOM (with
// the "msg-a:r" prefix) that doesn't match up with anything in the Gmail API.
// This function translates the Inbox ID into the real ID that can be found in
// the Gmail API.
async function getGmailMessageIdForSyncMessageId(driver: Driver, syncMessageId: string): Promise<string> {
  const accountParamMatch = document.location.pathname.match(/(\/u\/\d+)\//i);
  // Inbox omits the account param if there is only one logged in account,
  // but this page is backed by Gmail's backend which will always include it.
  const accountParam = accountParamMatch ? accountParamMatch[1] : '/u/0';

  const {text} = await gmailAjax({
    method: 'GET',
    url: `https://mail.google.com/mail${accountParam}`,
    canRetry: true,
    data: {
      ik: driver.getPageCommunicator().getIkValue(),
      view: 'om',
      permmsgid: syncMessageId
    }
  });

  const messageIdMatch = text.match(/<a\b[^<>]+\bhref="\/mail[^"]*(?:\?|&(?:amp;)?)view=att&(?:amp;)?th=([a-f0-9]+)&/i);
  if (!messageIdMatch) {
    throw new Error("Failed to find gmail message id for inbox message id");
  }
  return messageIdMatch[1];
}

export default defn(module, getGmailMessageIdForSyncMessageId);
