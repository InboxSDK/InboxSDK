/* @flow */

import gmailLimitedAjax from '../gmail-limited-ajax';
import type GmailDriver from '../gmail-driver';

export default function getRfcMessageIdForGmailMessageId(driver: GmailDriver, gmailMessageId: string): Promise<string> {
  return gmailLimitedAjax({
    method: 'GET',
    url: (document.location:any).origin+document.location.pathname,
    canRetry: true,
    data: {
      ik: driver.getPageCommunicator().getIkValue(),
      view: 'om',
      th: gmailMessageId
    }
  }).then(response => {
    var match = response.text.match(/^Message-ID:\s+(\S+)\s*$/im);
    if (!match) {
      throw new Error("Failed to find rfc id for gmail message id. Message may not exist in user's account.");
    }
    return match[1];
  });
}
