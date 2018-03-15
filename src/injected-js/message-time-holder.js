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
    const {target, detail: {threadId, ikValue, btaiHeader, xsrfToken}} = event;

    (async () => {
      const messageIndex = Array.from(target.parentElement.children)
        .filter(el => !el.classList.contains('inboxsdk__custom_message_view'))
        .indexOf(target);
      if (messageIndex < 0) {
        throw new Error('Should not happen');
      }

      let date: ?number = getDate(threadId, messageIndex);

      if (date == null) {
        try {
          await addDataForThread(threadId, ikValue, btaiHeader, xsrfToken);
        } catch (err) {
          logger.error(err);
        }
        date = getDate(threadId, messageIndex);
        if (date == null) {
          throw new Error('Failed to find message date after re-requesting thread');
        }
      }

      target.setAttribute('data-inboxsdk-sortdate', date);

    })().catch(err => {
      target.setAttribute('data-inboxsdk-sortdate', 'error');
      logger.error(err);
    });
  });
}

function getDate(threadId: string, messageIndex: number): ?number {
  const messages = threadIdToMessages.get(threadId);
  if(messages){
    const message = messages[messageIndex];
    if(message){
      return message.date;
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
        add([{
          threadID: syncThread.syncThreadID,
          messages: syncThread.extraMetaData.syncMessageData.map(syncMessage => ({
            date: syncMessage.date
          }))
        }]);
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
