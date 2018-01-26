/* @flow */

import {defn} from 'ud';

import getOriginalMessagePage from './getOriginalMessagePage';

import htmlToText from '../../common/html-to-text';

import type {Driver} from '../driver-interfaces/driver';

// Messages sent from the local user in Inbox have a fake ID in the DOM (with
// the "msg-a:r" prefix) that doesn't match up with anything in the Gmail API.
// This function translates the Inbox ID into the real ID that can be found in
// the Gmail API.
async function getRfcMessageIdForSyncMessageId(driver: Driver, syncMessageID: string): Promise<string> {
  const text = await getOriginalMessagePage(driver, {syncMessageID: syncMessageID});

  const match = text.match(/^Message-ID:\s+(\S+)\s*$/im);
  if (!match) {
    throw new Error("Failed to find rfc id for gmail thread id. Message may not exist in user's account.");
  }
  return htmlToText(match[1]);
}

export default defn(module, getRfcMessageIdForSyncMessageId);
