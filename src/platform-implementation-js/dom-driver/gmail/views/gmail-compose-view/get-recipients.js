/* @flow */

import GmailComposeView from '../gmail-compose-view';
import Logger from '../../../../lib/logger';

import getAddressInformationExtractor from './get-address-information-extractor';

export default function getRecipients(
  gmailComposeView: GmailComposeView,
  addressType: ReceiverType
): Contact[] {
  const contactNodes = gmailComposeView.tagTree.getAllByTag(
    `${addressType}Recipient`
  );
  return Array.from(contactNodes.values())
    .map(node => {
      const contactNode = node.getValue();
      if (contactNode.getAttribute('role') === 'option') {
        // new recipient
        // https://workspaceupdates.googleblog.com/2021/10/visual-updates-for-composing-email-in-gmail.html
        return {
          name: contactNode.getAttribute('data-name'),
          emailAddress: (contactNode.getAttribute('data-hovercard-id'): any)
        };
      } else {
        // old
        return getAddressInformationExtractor(
          addressType,
          gmailComposeView
        )(contactNode);
      }
    })
    .filter(Boolean);
}
