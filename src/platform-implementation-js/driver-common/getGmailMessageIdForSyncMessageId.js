/* @flow */

import {defn} from 'ud';

import getOriginalMessagePage from './getOriginalMessagePage';

import type {Driver} from '../driver-interfaces/driver';

// Messages sent from the local user in Inbox have a fake ID in the DOM (with
// the "msg-a:r" prefix) that doesn't match up with anything in the Gmail API.
// This function translates the Inbox ID into the real ID that can be found in
// the Gmail API.
async function getGmailMessageIdForSyncMessageId(driver: Driver, syncMessageID: string): Promise<string> {
  const text = await getOriginalMessagePage(driver, {syncMessageID: syncMessageID});

  const messageIdMatch = text.match(/<a\b[^<>]+\bhref="\/mail[^"]*(?:\?|&(?:amp;)?)view=att&(?:amp;)?th=([a-f0-9]+)&/i);
  if (!messageIdMatch) {
    throw new Error("Failed to find gmail message id for inbox message id");
  }
  return messageIdMatch[1];
}

export default defn(module, getGmailMessageIdForSyncMessageId);
