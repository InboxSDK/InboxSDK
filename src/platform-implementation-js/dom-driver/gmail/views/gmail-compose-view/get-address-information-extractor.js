/* @flow */

import Logger from '../../../../lib/logger';
import extractContactFromEmailContactString from '../../../../lib/extract-contact-from-email-contact-string';

import censorHTMLstring from '../../../../../common/censorHTMLstring';

import type GmailComposeView from '../gmail-compose-view';

export default function getAddressInformationExtractor(
  addressType: string,
  composeView: GmailComposeView
): (node: HTMLElement) => Contact | null {
  return function(node: HTMLElement): Contact | null {
    const contactNode =
      node instanceof HTMLInputElement &&
      node.getAttribute('name') === addressType
        ? node
        : node.querySelector(`input[name='${addressType}']`);

    var emailAddress = null;
    var name = null;

    if (contactNode) {
      var contactInfoString = (contactNode: any).value;

      try {
        return extractContactFromEmailContactString(contactInfoString);
      } catch (err) {
        // The user might have typed in a partial address. We can just ignore that.
        return null;
      }
    } else {
      Logger.error(new Error(`contactNode can't be found`), {
        addressType,
        composeViewHtml: censorHTMLstring(composeView.getElement().outerHTML)
      });

      return null;
    }
  };
}
