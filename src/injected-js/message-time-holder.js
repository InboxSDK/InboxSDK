/* @flow */

import querystring from 'querystring';
import type {Message} from '../platform-implementation-js/dom-driver/gmail/gmail-response-processor';
import {extractMessages} from '../platform-implementation-js/dom-driver/gmail/gmail-response-processor';
import * as logger from './injected-logger';
import requestGmailThread from '../platform-implementation-js/driver-common/requestGmailThread';

const threadIdToMessages: Map<string, Message[]> = new Map();

export function setup() {
  document.addEventListener('inboxSDKtellMeThisMessageDate', function(event: Object) {
    const {target, detail: {threadId, ikValue}} = event;

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
          await addDataForThread(ikValue, threadId);
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

function addDataForThread(ikValue: string, threadId: string): Promise<void> {
  const existingRequestPromise = activeThreadRequestPromises.get(threadId);
  if (existingRequestPromise) {
    return existingRequestPromise;
  }

  const newPromise = (async () => {
    try {
      const text = await requestGmailThread(ikValue, threadId);
      add(extractMessages(text));
    } catch (err) {
      logger.error(err);
    } finally {
      activeThreadRequestPromises.delete(threadId);
    }
  })();

  activeThreadRequestPromises.set(threadId, newPromise);
  return newPromise;
}
