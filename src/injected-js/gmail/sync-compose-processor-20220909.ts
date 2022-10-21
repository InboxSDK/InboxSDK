import intersection from 'lodash/intersection';
import last from 'lodash/last';
import {
  ComposeRequestType,
  DRAFT_SAVING_ACTIONS,
  SEND_ACTIONS,
} from './constants';

export function parseComposeRequestBody_2022_09_09(request: Array<any>) {
  return (
    parseCreateDraftRequestBody(request) ||
    parseUpdateDraftRequestBody(request) ||
    parseSendDraftRequestBody(request)
  );
}

export function parseComposeResponseBody_2022_09_09(response: Array<any>) {
  return (
    parseUpdateDraftResponseBody(response) ||
    parseSendDraftResponseBody(response)
  );
}

export function replaceBodyContentInComposeSendRequestBody_2022_09_09(
  request: Array<any>,
  newBodyHtmlContent: string
): Array<any> | null {
  return replaceBodyContentInSendRequestBody(request, newBodyHtmlContent);
}

/**
 * Parses request when compose window saves draft for the first time (creates draft)
 */
function parseCreateDraftRequestBody(request: Array<any>) {
  const thread = request[1]?.[0]?.[0]?.[1];
  if (!Array.isArray(thread)) {
    // exit cuz cannot parse
    return null;
  }

  const threadId = parseThreadId(thread[0]);
  if (!threadId) {
    // exit cuz cannot parse
    return null;
  }

  const msg =
    /* new msg */ thread[1]?.[2]?.[0]?.[4]?.[0] ||
    /* reply */ thread[1]?.[1]?.[0];

  if (!Array.isArray(msg)) {
    // exit cuz cannot parse
    return null;
  }

  const message = parseMsgInRequest(msg);
  if (!message) {
    // exit cuz cannot parse
    return null;
  }

  const { messageId, subject, body, actions } = message;

  const hasRequiredActions =
    intersection(actions, DRAFT_SAVING_ACTIONS).length ===
    DRAFT_SAVING_ACTIONS.length;

  if (!hasRequiredActions) {
    // exit if doesn't have required actions
    return null;
  }

  return {
    threadId,
    messageId,
    subject,
    body,
    actions,
    type: 'FIRST_DRAFT_SAVE' as ComposeRequestType,
  };
}

/**
 * Parses request when compose window updates draft (consecutive updates after creation)
 */
function parseUpdateDraftRequestBody(request: Array<any>) {
  const thread =
    request[1] && request[1][0] && request[1][0][0] && request[1][0][0][1];

  if (!Array.isArray(thread)) {
    // exit cuz cannot parse
    return null;
  }

  const threadId = parseThreadId(thread[0]);
  if (!threadId) {
    // exit cuz cannot parse
    return null;
  }

  const msg = thread[1] && thread[1][13] && thread[1][13][0];

  if (!Array.isArray(msg)) {
    // exit cuz cannot parse
    return null;
  }

  const message = parseMsgInRequest(msg);
  if (!message) {
    // exit cuz cannot parse
    return null;
  }

  const { messageId, subject, body, actions } = message;

  const hasRequiredActions =
    intersection(actions, DRAFT_SAVING_ACTIONS).length ===
    DRAFT_SAVING_ACTIONS.length;

  if (!hasRequiredActions) {
    // exit if doesn't have required actions
    return null;
  }

  return {
    threadId,
    messageId,
    subject,
    body,
    actions,
    type: 'DRAFT_SAVE' as ComposeRequestType,
  };
}

/**
 * Parses request when compose window sends draft
 */
function parseSendDraftRequestBody(request: Array<any>) {
  const thread =
    request[1] && request[1][0] && request[1][0][0] && request[1][0][0][1];

  if (!Array.isArray(thread)) {
    // exit cuz cannot parse
    return null;
  }

  const threadId = parseThreadId(thread[0]);
  if (!threadId) {
    // exit cuz cannot parse
    return null;
  }

  const msg =
    /* new msg */ (thread[1] && thread[1][13] && thread[1][13][0]) ||
    /* reply */ (thread[1] && thread[1][1] && thread[1][1][0]);

  if (!Array.isArray(msg)) {
    // exit cuz cannot parse
    return null;
  }

  const message = parseMsgInRequest(msg);
  if (!message) {
    // exit cuz cannot parse
    return null;
  }

  const { messageId, subject, body, actions } = message;

  const hasRequiredActions =
    intersection(actions, SEND_ACTIONS).length === SEND_ACTIONS.length;

  if (!hasRequiredActions) {
    // exit if doesn't have required actions
    return null;
  }

  return {
    threadId,
    messageId,
    subject,
    body,
    actions,
    type: 'SEND' as ComposeRequestType,
  };
}

/**
 * Parses response when compose window saves draft for the first time or updates it
 */
function parseUpdateDraftResponseBody(response: Array<any>) {
  const thread = response[1]?.[5]?.[0]?.[0];
  if (!Array.isArray(thread)) {
    // exit cuz cannot parse
    return null;
  }

  const threadId = parseThreadId(thread[0]);
  if (!threadId) {
    // exit cuz cannot parse
    return null;
  }

  const threadInner = thread[2]?.[6]?.[0];
  if (!Array.isArray(threadInner)) {
    // exit cuz cannot parse
    return null;
  }

  const oldThreadId = threadInner[19];

  const msg = last(threadInner[4]);
  if (!Array.isArray(msg)) {
    // exit cuz cannot parse
    return null;
  }

  const message = parseMsgInResponse(msg);
  if (!message) {
    // exit cuz cannot parse
    return null;
  }

  const { messageId, actions, rfcID, oldMessageId } = message;

  const hasRequiredActions =
    intersection(actions, DRAFT_SAVING_ACTIONS).length ===
    DRAFT_SAVING_ACTIONS.length;

  if (!hasRequiredActions) {
    // exit if doesn't have required actions
    return null;
  }

  return {
    threadId,
    messageId,
    actions,
    rfcID,
    oldMessageId,
    oldThreadId,
    type: 'DRAFT_SAVE' as ComposeRequestType,
  };
}

/**
 * Parses response when compose window saves draft for the first time or updates it
 */
function parseSendDraftResponseBody(response: Array<any>) {
  const thread = response[1]?.[5]?.[0]?.[0];
  if (!Array.isArray(thread)) {
    // exit cuz cannot parse
    return null;
  }

  const threadId = parseThreadId(thread[0]);
  if (!threadId) {
    // exit cuz cannot parse
    return null;
  }

  const threadInner = thread[2]?.[6]?.[0];
  if (!Array.isArray(threadInner)) {
    // exit cuz cannot parse
    return null;
  }

  const oldThreadId = threadInner[19];

  const msg = threadInner[4] && last(threadInner[4]);
  if (!Array.isArray(msg)) {
    // exit cuz cannot parse
    return null;
  }

  const message = parseMsgInResponse(msg);
  if (!message) {
    // exit cuz cannot parse
    return null;
  }

  const { messageId, actions, rfcID, oldMessageId } = message;

  const hasRequiredActions =
    intersection(actions, SEND_ACTIONS).length === SEND_ACTIONS.length;

  if (!hasRequiredActions) {
    // exit if doesn't have required actions
    return null;
  }

  return {
    threadId,
    messageId,
    actions,
    rfcID,
    oldMessageId,
    oldThreadId,
    type: 'SEND' as ComposeRequestType,
  };
}

function replaceBodyContentInSendRequestBody(
  request: Array<any>,
  newBodyHtmlContent: string
) {
  const thread = request[1]?.[0]?.[0]?.[1];
  if (!thread) {
    return null;
  }

  const threadId = parseThreadId(thread[0]);
  if (!threadId) {
    // exit cuz cannot parse
    return null;
  }

  const msg =
    /* new msg */ thread[1]?.[13]?.[0] || /* reply */ thread[1]?.[1]?.[0];

  if (!Array.isArray(msg)) {
    // exit cuz cannot parse
    return null;
  }

  const messageId = parseMsgId(msg[0]);
  if (!messageId) {
    // exit cuz cannot parse
    return null;
  }

  msg[8][1][0][1] = newBodyHtmlContent;

  return request;
}

function parseThreadId(threadId: string): string | null {
  if (!threadId.startsWith('thread-')) {
    return null;
  }

  if (threadId.indexOf('|') > -1) {
    return threadId.split('|')[0];
  }

  return threadId;
}

function parseMsgId(messageId: string): string | null {
  if (!messageId.startsWith('msg-')) {
    // exit cuz cannot parse
    return null;
  }

  return messageId;
}

function parseMsgInRequest(msg: any[]) {
  if (!Array.isArray(msg)) {
    // exit cuz cannot parse
    return null;
  }

  const messageId = parseMsgId(msg[0]);
  if (!messageId) {
    // exit cuz cannot parse
    return null;
  }

  const subject = msg[7];
  const body = msg[8][1][0][1];
  const actions = msg[10];
  const rfcID = msg[13];
  const oldMessageId = msg[55];

  return {
    messageId,
    subject,
    body,
    actions,
    rfcID,
    oldMessageId,
  };
}

function parseMsgInResponse(msg: any[]) {
  if (!Array.isArray(msg)) {
    // exit cuz cannot parse
    return null;
  }

  const messageId = parseMsgId(msg[0]);
  if (!messageId) {
    // exit cuz cannot parse
    return null;
  }

  const actions = msg[10];
  const rfcID = msg[13];
  const oldMessageId = msg[55];

  return {
    messageId,
    actions,
    rfcID,
    oldMessageId,
  };
}
