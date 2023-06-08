import sortBy from 'lodash/sortBy';
import intersection from 'lodash/intersection';

import isNotNil from '../../platform-implementation-js/lib/isNotNil';
import {
  ComposeRequestType,
  DRAFT_SAVING_ACTIONS,
  SEND_ACTIONS,
} from './constants';
import { Contact } from '../../inboxsdk';

const ACTION_TYPE_PRIORITY_RANK: [ComposeRequestType, ComposeRequestType] = [
  'SEND',
  'DRAFT_SAVE',
];

export function parseComposeRequestBody_2022_09_09(request: Array<any>) {
  return parseCreateUpdateSendDraftRequestBody(request);
}

export function parseComposeResponseBody_2022_09_09(response: Array<any>) {
  return parseCreateUpdateSendDraftResponseBody(response);
}

export function replaceBodyContentInComposeSendRequestBody_2022_09_09(
  request: Array<any>,
  newBodyHtmlContent: string
): Array<any> | null {
  return replaceBodyContentInSendRequestBody(request, newBodyHtmlContent);
}

/**
 * Parses request body when compose window either saves a draft for the first time,
 * updates the draft or sends the draft.
 * NOTE: request could contain multiple threads and messages within it,
 * prioritize SEND to DRAFT_SAVE message.
 */
function parseCreateUpdateSendDraftRequestBody(request: any[]) {
  const updateList = request[1]?.[0];

  if (!Array.isArray(updateList)) {
    // cannot parse
    return null;
  }

  const parsedMessages = updateList.map(parseRequestThread).filter(isNotNil);

  const sorted = sortBy(parsedMessages, (m) =>
    ACTION_TYPE_PRIORITY_RANK.indexOf(m.type)
  );

  return sorted[0] || null;
}

/**
 * Parses response body when compose window either saved a draft for the first time,
 * updated the draft, or sent the draft.
 * NOTE: response could contain multiple threads and messages within it
 * even not related to a message/thread in the request body.
 * So the calling code should find needed message manually.
 */
function parseCreateUpdateSendDraftResponseBody(response: any[]) {
  const updateList = response[1]?.[5];

  if (!Array.isArray(updateList)) {
    // cannot parse
    return [];
  }

  return updateList
    .map(parseResponseThread)
    .filter(isNotNil)
    .flatMap((parsedThread) => {
      const { threadId, oldThreadId, parsedMessages } = parsedThread;

      return parsedMessages.map((parsedMessage) => {
        const { messageId, to, cc, bcc, actions, rfcID, oldMessageId } =
          parsedMessage;

        const actionType = actionsToComposeRequestType(actions);

        if (!actionType) {
          // unsupported actions within a message
          return null;
        }

        return {
          threadId,
          messageId,
          to,
          cc,
          bcc,
          actions,
          rfcID,
          oldMessageId,
          oldThreadId,
          type: actionType,
        };
      });
    })
    .filter(isNotNil);
}

function replaceBodyContentInSendRequestBody(
  request: Array<any>,
  newBodyHtmlContent: string
) {
  // since draftID is not passed from outside,
  // use parse function to find a message which body needs to be replaced
  const parsed = parseCreateUpdateSendDraftRequestBody(request);
  if (!parsed) {
    return null;
  }

  const replaceBodyInThisMessageId = parsed.messageId;

  const updateList = request[1]?.[0];

  if (!Array.isArray(updateList)) {
    // cannot parse
    return null;
  }

  for (const threadWrapper of updateList) {
    if (!Array.isArray(threadWrapper) || !Array.isArray(threadWrapper[1])) {
      // cannot parse
      return null;
    }

    const thread = threadWrapper[1];

    const threadId = parseThreadId(thread[0]);
    if (!threadId) {
      // cannot parse
      return null;
    }

    const parseResult = findAndParseRequestMessage(thread);

    if (parseResult?.parsedMsg.messageId === replaceBodyInThisMessageId) {
      const actionType = actionsToComposeRequestType(
        parseResult.parsedMsg.actions
      );

      if (actionType === 'SEND') {
        // find first message with needed messageId and 'SEND' action and replace the body content
        replaceBodyInRequestMsg(parseResult.originalMsg, newBodyHtmlContent);
        return request;
      }
    }
  }

  return null;
}

function parseThreadId(threadId: string): string | null {
  if (!threadId.startsWith('thread-')) {
    return null;
  }

  if (threadId.includes('|')) {
    return threadId.split('|')[0];
  }

  return threadId;
}

function parseMsgId(messageId: string): string | null {
  if (!messageId.startsWith('msg-')) {
    // cannot parse
    return null;
  }

  return messageId;
}

function parseContacts(contacts: any[]): Contact[] | null {
  if (!Array.isArray(contacts)) {
    // cannot parse
    return null;
  }

  return contacts
    .filter((c) => !!c[1])
    .map((c): Contact => ({ emailAddress: c[1], name: c[2] ?? null }));
}

function findAndParseRequestMessage(thread: any[]): {
  parsedMsg: NonNullable<ReturnType<typeof parseRequestMsg>>;
  originalMsg: any;
} | null {
  const originalMsgs = [
    thread[1]?.[2]?.[0]?.[4]?.[0],
    thread[1]?.[1]?.[0],
    thread[1]?.[13]?.[0],
  ];

  for (const originalMsg of originalMsgs) {
    const parsedMsg = parseRequestMsg(originalMsg);
    if (parsedMsg) {
      return { parsedMsg, originalMsg };
    }
  }

  return null;
}

function parseRequestThread(threadWrapper: any) {
  if (!Array.isArray(threadWrapper) || !Array.isArray(threadWrapper[1])) {
    // cannot parse
    return null;
  }

  const thread = threadWrapper[1];

  const threadId = parseThreadId(thread[0]);
  if (!threadId) {
    // cannot parse
    return null;
  }

  const parseResult = findAndParseRequestMessage(thread);

  if (!parseResult) {
    // cannot parse
    return null;
  }

  const { parsedMsg: message, originalMsg } = parseResult;

  const { messageId, to, cc, bcc, subject, body, actions } = message;

  let actionType = actionsToComposeRequestType(actions);
  if (!actionType) {
    // exit if doesn't have required actions
    return null;
  }

  // usually for draft_save action when draft or reply got saved for first time, response could be different
  // from usual update response, so replace draft_save action with first_draft_save in this case.
  if (
    actionType === 'DRAFT_SAVE' &&
    (originalMsg === thread[1]?.[2]?.[0]?.[4]?.[0] ||
      originalMsg === thread[1]?.[1]?.[0])
  ) {
    actionType = 'FIRST_DRAFT_SAVE';
  }

  return {
    threadId,
    messageId,
    to,
    cc,
    bcc,
    subject,
    body,
    actions,
    type: actionType,
  };
}

function parseRequestMsg(msg: any) {
  if (!Array.isArray(msg)) {
    // cannot parse
    return null;
  }

  const messageId = parseMsgId(msg[0]);
  if (!messageId) {
    // cannot parse
    return null;
  }

  const subject = msg[7];
  const to = parseContacts(msg[2]);
  const cc = parseContacts(msg[3]);
  const bcc = parseContacts(msg[4]);
  const body = msg[8][1][0][1];
  const actions = msg[10];
  const rfcID = msg[13];
  const oldMessageId = msg[55];

  return {
    messageId,
    to,
    cc,
    bcc,
    subject,
    body,
    actions,
    rfcID,
    oldMessageId,
  };
}

function replaceBodyInRequestMsg(msg: any, newBodyHtmlContent: string) {
  if (!Array.isArray(msg)) {
    // cannot parse
    return null;
  }

  msg[8][1][0][1] = newBodyHtmlContent;
}

function parseResponseThread(threadWrapper: any) {
  if (!Array.isArray(threadWrapper) || !Array.isArray(threadWrapper[0])) {
    // cannot parse
    return null;
  }

  const thread = threadWrapper[0];
  const threadId = parseThreadId(thread[0]);
  if (!threadId) {
    // cannot parse
    return null;
  }

  const threadInner = thread[2]?.[6]?.[0];
  if (!Array.isArray(threadInner)) {
    // cannot parse
    return null;
  }

  const oldThreadId = threadInner[19];

  const parsedMessages = Array.isArray(threadInner[4])
    ? threadInner[4]
        .map((msg) => {
          if (!Array.isArray(msg)) {
            // cannot parse
            return null;
          }

          return parseResponseMsg(msg);
        })
        .filter(isNotNil)
    : [];

  return {
    threadId,
    oldThreadId,
    parsedMessages,
  };
}

function parseResponseMsg(msg: any[]) {
  if (!Array.isArray(msg)) {
    // cannot parse
    return null;
  }

  const messageId = parseMsgId(msg[0]);
  if (!messageId) {
    // cannot parse
    return null;
  }

  const actions: string[] = msg[10];
  const to = parseContacts(msg[2]);
  const cc = parseContacts(msg[3]);
  const bcc = parseContacts(msg[4]);
  const rfcID = msg[13];
  const oldMessageId = msg[55];

  return {
    messageId,
    to,
    cc,
    bcc,
    actions,
    rfcID,
    oldMessageId,
  };
}

export function actionsToComposeRequestType(
  actions: string[]
): ComposeRequestType | null {
  if (
    intersection(actions, DRAFT_SAVING_ACTIONS).length ===
    DRAFT_SAVING_ACTIONS.length
  ) {
    return 'DRAFT_SAVE';
  }

  if (intersection(actions, SEND_ACTIONS).length === SEND_ACTIONS.length) {
    return 'SEND';
  }

  return null;
}
