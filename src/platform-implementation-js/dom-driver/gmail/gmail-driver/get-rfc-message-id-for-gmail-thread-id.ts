import gmailAjax from '../../../driver-common/gmailAjax';

import GmailDriver from '../gmail-driver';
import querystring from 'querystring';
import * as GmailResponseProcessor from '../gmail-response-processor';
import getRfcMessageIdForGmailMessageId from './get-rfc-message-id-for-gmail-message-id';

export default async function getRfcMessageIdForGmailThreadId(
  driver: GmailDriver,
  gmailThreadId: string
): Promise<string> {
  const messageIdQuery = {
    ui: 2,
    ik: driver.getPageCommunicator().getIkValue(),
    view: 'cv',
    th: gmailThreadId,
    nsc: 1,
    mb: 0,
    rt: 'j',
    search: 'all',
  };

  const gmailMessageIdResponse = await gmailAjax({
    method: 'POST',
    url:
      document.location.origin +
      document.location.pathname +
      '?' +
      querystring.stringify(messageIdQuery),
    canRetry: true,
  });

  const extractedIds =
    GmailResponseProcessor.extractMessageIdsFromThreadBatchRequest(
      gmailMessageIdResponse.text
    );

  if (Object.keys(extractedIds).length !== 1) {
    throw new Error(
      `Expected to find 1 thread/message ID pair, but got ${
        Object.keys(extractedIds).length
      }`
    );
  }

  const gmailMessageId = extractedIds[gmailThreadId];
  if (!gmailMessageId) {
    throw new Error('Could not find a message ID for given thread ID');
  }

  return getRfcMessageIdForGmailMessageId(driver, gmailMessageId);
}
