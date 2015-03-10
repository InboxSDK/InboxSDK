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
  }).then(response => {
    const match = response.text.match(/^Message-ID:\s+(\S+)\s*$/im);
    if (!match) {
      throw new Error("Failed to find rfc id for gmail message id. Message may not exist in user's account.");
    }
    return match[1];
  });
}
