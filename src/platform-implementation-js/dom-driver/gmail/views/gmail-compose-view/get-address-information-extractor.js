/* @flow */

import Logger from '../../../../lib/logger';
import Kefir from 'kefir';
import extractContactFromEmailContactString from '../../../../lib/extract-contact-from-email-contact-string';

import censorHTMLstring from '../../../../../common/censor-html-string.js';

import type GmailComposeView from '../gmail-compose-view';

export default function getAddressInformationExtractor(
  addressType: string,
  composeView: GmailComposeView
): (node: HTMLElement) => ?Contact {
  return function(node: HTMLElement): ?Contact {
    const contactNode = node.querySelector(`input[name='${addressType}']`);

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

      // Maybe the issue is Gmail is doing lazy loading? Let's test for that.
      Kefir.later(5000)
        .takeUntilBy(composeView.getStopper())
        .onValue(() => {
          const contactNode = node.querySelector(
            `input[name='${addressType}']`
          );
          Logger.error(new Error(`contactNode re-check status`), {
            addressType,
            contactNodePresent: contactNode != null
          });
        });

      return null;
    }
  };
}
