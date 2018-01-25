/* @flow */

import intersection from 'lodash/intersection';

type ComposeRequestType = 'FIRST_DRAFT_SAVE' | 'DRAFT_SAVE' | 'SEND';

type ComposeRequest = {
  draftID: string;
  body: string;
  subject: string;
  type: ComposeRequestType;
};

const SEND_ACTIONS = ["^pfg"];
const DRAFT_SAVING_ACTIONS = ["^r", "^r_bt"];

export function getDetailsOfComposeRequest(request: string): ?ComposeRequest {
  const parsed = JSON.parse(request);

  const updateList = (
    parsed[2] &&
    parsed[2][1]
  );
  if (!updateList) return null;

  const messageUpdates = updateList.filter((update) => {
    const updateWrapper = (
      update[2] &&
      update[2][2] &&
      (update[2][2][14] || update[2][2][2])
    );
    return (
      updateWrapper &&
      updateWrapper[1] &&
      updateWrapper[1][1] &&
      updateWrapper[1][1].indexOf('msg-a:') > -1
    );
  });

  if (messageUpdates.length) {
    const sendUpdateMatch = messageUpdates.find((update) => {
      const updateWrapper = (
        update[2] &&
        update[2][2] &&
        (update[2][2][14] || update[2][2][2])
      );

      return (
        updateWrapper[1][11] &&
        intersection(
          updateWrapper[1][11],
          SEND_ACTIONS
        ).length === SEND_ACTIONS.length
      );
    });

    if (sendUpdateMatch) {
      const sendUpdateWrapper = (
        sendUpdateMatch[2] &&
        sendUpdateMatch[2][2] &&
        (sendUpdateMatch[2][2][14] || sendUpdateMatch[2][2][2])
      );
      const sendUpdate = sendUpdateWrapper[1];
      return getComposeRequestFromUpdate(sendUpdate, 'SEND');
    }
    else {
      // There's a small chance that an update list could contain the
      // draft saves for multiple drafts in some situations — we've never
      // seen this so currently just picking the first update and assuming
      // that if there are multiple updates in the request they are for
      // queued up versions of the same draft.

      const firstMessageUpdate = messageUpdates[0];
      const updateWrapper = (
        firstMessageUpdate[2] &&
        firstMessageUpdate[2][2] &&
        (firstMessageUpdate[2][2][14] || firstMessageUpdate[2][2][2])
      );
      const update = updateWrapper[1];
      return getComposeRequestFromUpdate(update, 'DRAFT_SAVE');
    }
  }
  else {
    // the first time a draft is saved it has a different response format
    const messageUpdates = updateList.map(update =>
      update[2] &&
      update[2][2] &&
      update[2][2][3] &&
      update[2][2][3][1] &&
      update[2][2][3][1][5] &&
      update[2][2][3][1][5][0]
    ).filter(Boolean);

    if(messageUpdates.length === 0) return;
    const firstMessageUpdate = messageUpdates[0];

    return getComposeRequestFromUpdate(firstMessageUpdate, 'FIRST_DRAFT_SAVE');
  }
}

function getComposeRequestFromUpdate(update: Object, type: ComposeRequestType): ?ComposeRequest {
  const body = (
    update[9] &&
    update[9][2] &&
    update[9][2][0] &&
    update[9][2][0][2]
  );

  if(body == null) return null;

  return {
    body, type,
    draftID: update[1].replace('msg-a:', ''),
    subject: update[8]
  };
}

export function replaceEmailBodyForSendRequest(request: string, newBody: ?string): string {
  if(!newBody) return request;

  const parsed = JSON.parse(request);

  const updateList = (
    parsed[2] &&
    parsed[2][1]
  );
  if (!updateList) return request;

  const messageUpdates = updateList.filter((update) => {
    const updateWrapper = (
      update[2] &&
      update[2][2] &&
      (update[2][2][14] || update[2][2][2])
    );
    return (
      updateWrapper &&
      updateWrapper[1] &&
      updateWrapper[1][1] &&
      updateWrapper[1][1].indexOf('msg-a:') > -1
    );
  });

  if (!messageUpdates.length)  return request;
  const sendUpdateMatch = messageUpdates.find((update) => {
    const updateWrapper = (
      update[2] &&
      update[2][2] &&
      (update[2][2][14] || update[2][2][2])
    );

    return (
      updateWrapper[1][11] &&
      intersection(
        updateWrapper[1][11],
        SEND_ACTIONS
      ).length === SEND_ACTIONS.length
    );
  });

  if (!sendUpdateMatch) return request;
  const sendUpdateWrapper = (
    sendUpdateMatch[2] &&
    sendUpdateMatch[2][2] &&
    (sendUpdateMatch[2][2][14] || sendUpdateMatch[2][2][2])
  );
  const sendUpdate = sendUpdateWrapper[1];
  sendUpdate[9][2][0][2] = newBody;

  return JSON.stringify(parsed);
}
