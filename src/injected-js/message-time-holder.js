/* @flow */

import type {Message} from '../platform-implementation-js/dom-driver/gmail/gmail-response-processor';

const threadIdToMessages: Map<string, Message[]> = new Map();

export function setup() {
  document.addEventListener('inboxSDKtellMeThisMessageDate', function(event:any) {
    const {target, detail: {threadId}} = event;

    const messages = threadIdToMessages.get(threadId);
    if(messages){
      const index = Array.from(target.parentElement.children).indexOf(target);
      const message = messages[index];

      if(message){
        event.target.setAttribute('data-inboxsdk-sortdate', message.date);
      }
    }
  });
}

export function add(groupedMessages: Array<{threadID: string; messages: Message[]}>) {
  groupedMessages.forEach(group => {
    threadIdToMessages.set(group.threadID, group.messages);
  });
}
