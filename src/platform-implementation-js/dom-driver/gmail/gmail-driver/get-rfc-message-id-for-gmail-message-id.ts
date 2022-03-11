import getOriginalMessagePage from '../../../driver-common/getOriginalMessagePage';

import GmailDriver from '../gmail-driver';
import htmlToText from '../../../../common/html-to-text';

export default async function getRfcMessageIdForGmailMessageId(
  driver: GmailDriver,
  gmailMessageId: string
): Promise<string> {
  const text = await getOriginalMessagePage(driver, {
    oldGmailMessageID: gmailMessageId,
  });
  const match = text.match(/^Message-ID:\s+(\S+)\s*$/im);
  if (!match) {
    throw new Error(
      "Failed to find rfc id for gmail thread id. Message may not exist in user's account."
    );
  }
  return htmlToText(match[1]);
}
