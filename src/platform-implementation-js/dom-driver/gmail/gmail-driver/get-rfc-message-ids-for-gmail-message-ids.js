import RSVP from 'rsvp';
import co from 'co';

import ajax from '../../../../common/ajax';

const getRfcMessageIdForGmailMessageId = co.wrap(function*(driver, gmailMessageId) {
  const response = yield ajax({
    method: 'GET',
    url: location.origin+location.pathname,
    data: {
      ik: driver.getPageCommunicator().getIkValue(),
      view: 'om',
      th: gmailMessageId
    }
  });
  return response.match(/^Message-ID:\s+(\S+)\s*$/im)[1];
});

export default function getRfcMessageIdsForGmailMessageIds(driver, gmailMessageIds) {
  return RSVP.Promise.all(
    gmailMessageIds.map(getRfcMessageIdForGmailMessageId.bind(null, driver)));
}
