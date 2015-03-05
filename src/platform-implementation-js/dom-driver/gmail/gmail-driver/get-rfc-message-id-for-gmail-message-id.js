import ajax from '../../../../common/ajax';

export default function getRfcMessageIdForGmailMessageId(driver, gmailMessageId) {
  return ajax({
    method: 'GET',
    url: location.origin+location.pathname,
    data: {
      ik: driver.getPageCommunicator().getIkValue(),
      view: 'om',
      th: gmailMessageId
    }
  }).then(response => response.text.match(/^Message-ID:\s+(\S+)\s*$/im)[1]);
}
