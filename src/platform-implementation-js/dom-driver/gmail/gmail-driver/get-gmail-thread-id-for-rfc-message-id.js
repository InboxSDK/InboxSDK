import assert from 'assert';
import RSVP from 'rsvp';
import {extractThreads} from '../gmail-response-processor';
import ajax from '../../../../common/ajax';

export default function getGmailThreadIdForRfcMessageId(driver, rfcMessageId) {
  const searchString = 'rfc822msgid:'+rfcMessageId;
  return ajax({
    method: 'GET',
    url: location.origin+location.pathname,
    data: {
      ik: driver.getPageCommunicator().getIkValue(),
      ui: 2,
      view: 'tl',
      start: 0,
      num: 1,
      rt: 'c',
      pcd: '1',
      mb: '0',
      search: 'apps',
      apps: 'apps',
      q: searchString
    }
  }).then(response => {
    const threads = extractThreads(response.text);
    assert.equal(threads.length, 1);
    return threads[0].gmailThreadId;
  });
}
