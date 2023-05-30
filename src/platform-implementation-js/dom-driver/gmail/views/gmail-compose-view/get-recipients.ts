import GmailComposeView from '../gmail-compose-view';
import { getRecipientChips } from './page-parser';

import getAddressInformationExtractor from './get-address-information-extractor';
import { ReceiverType } from './set-recipients';
import isNotNil from '../../../../lib/isNotNil';
import { Contact } from '../../../../../inboxsdk';

export default function getRecipients(
  gmailComposeView: GmailComposeView,
  addressType: ReceiverType
): Contact[] {
  const contactNodes = getRecipientChips(
    gmailComposeView.getElement(),
    addressType
  );
  return Array.from(contactNodes)
    .map((contactNode) => {
      if (contactNode.getAttribute('role') === 'option') {
        // new recipient
        // https://workspaceupdates.googleblog.com/2021/10/visual-updates-for-composing-email-in-gmail.html
        return {
          name: contactNode.getAttribute('data-name')!,
          emailAddress: contactNode.getAttribute('data-hovercard-id')!,
        };
      } else {
        // old
        return getAddressInformationExtractor(
          addressType,
          gmailComposeView
        )(contactNode);
      }
    })
    .filter(isNotNil);
}
