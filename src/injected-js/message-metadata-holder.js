/* @flow */

import querystring from 'querystring';
import startsWith from 'lodash/startsWith';
import type {Message} from '../platform-implementation-js/dom-driver/gmail/gmail-response-processor';
import {extractMessages} from '../platform-implementation-js/dom-driver/gmail/gmail-response-processor';
import {getThreadFromSyncThreadIdUsingHeaders} from '../platform-implementation-js/dom-driver/gmail/gmail-driver/getSyncThreadFromSyncThreadId';
import * as logger from './injected-logger';
import requestGmailThread from '../platform-implementation-js/driver-common/requestGmailThread';

const threadIdToMessages: Map<string, Message[]> = new Map();

export function setup() {
  document.addEventListener('inboxSDKtellMeThisMessageDate', function(event: Object) {
    exposeMetadata(event, 'data-inboxsdk-sortdate', m => m.date);
  });

  document.addEventListener('inboxSDKtellMeThisMessageRecipients', function(event: Object) {
    exposeMetadata(event, 'data-inboxsdk-recipients', m => {
      if(m.recipients) return m.recipients;
      else return null;
    });
  });
}

function exposeMetadata(event, attribute, processor){
  const {target, detail: {threadId, ikValue, btaiHeader, xsrfToken}} = event;

  (async () => {
    const messageIndex = Array.from(target.parentElement.children)
      .filter(el => !el.classList.contains('inboxsdk__custom_message_view'))
      .indexOf(target);
    if (messageIndex < 0) {
      throw new Error('Should not happen');
    }

    let message = getMessage(threadId, messageIndex);

    if (message == null || !message.recipients) {
      try {
        await addDataForThread(threadId, ikValue, btaiHeader, xsrfToken);
      } catch (err) {
        logger.error(err);
      }
      message = getMessage(threadId, messageIndex);
      if (message == null) {
        throw new Error('Failed to find message date after re-requesting thread');
      }
    }

    target.setAttribute(attribute, JSON.stringify(processor(message)));

  })().catch(err => {
    target.setAttribute(attribute, 'error');
    logger.error(err);
  });
}

function getMessage(threadId: string, messageIndex: number): ?Message {
  const messages = threadIdToMessages.get(threadId);
  if(messages){
    const message = messages[messageIndex];
    if(message){
      return message;
    }
  }
}

export function add(groupedMessages: Array<{threadID: string; messages: Message[]}>) {
  groupedMessages.forEach(group => {
    threadIdToMessages.set(group.threadID, group.messages);
  });
}

const activeThreadRequestPromises: Map<string, Promise<void>> = new Map();

function addDataForThread(
  threadId: string, ikValue: string, btaiHeader: ?string, xsrfToken: ?string
): Promise<void> {
  const existingRequestPromise = activeThreadRequestPromises.get(threadId);
  if (existingRequestPromise) {
    return existingRequestPromise;
  }

  const newPromise = (async () => {
    try {
      if (startsWith(threadId, 'thread')) { // new data layer
        if (!btaiHeader || !xsrfToken) {
          throw new Error('Need btaiHeader and xsrfToken when in new data layer');
        }
        const syncThread = await getThreadFromSyncThreadIdUsingHeaders(threadId, btaiHeader, xsrfToken);
        if(syncThread){
          add([{
            threadID: syncThread.syncThreadID,
            messages: syncThread.extraMetaData.syncMessageData.map(syncMessage => ({
              date: syncMessage.date,
              recipients: syncMessage.recipients
            }))
          }]);
        }
      } else { // legacy gmail
        const text = await requestGmailThread(ikValue, threadId);
        add(extractMessages(text));
      }
    } catch (err) {
      logger.error(err);
    } finally {
      activeThreadRequestPromises.delete(threadId);
    }
  })();

  activeThreadRequestPromises.set(threadId, newPromise);
  return newPromise;
}
