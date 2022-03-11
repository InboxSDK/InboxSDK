/* @flow */

import Kefir from 'kefir';
import t from 'transducers.js';

import Logger from '../../../../lib/logger';
import makeMutationObserverStream from '../../../../lib/dom/make-mutation-observer-stream';
import getAddressInformationExtractor from './get-address-information-extractor';
import { getRecipientRowElements } from './page-parser';

import type GmailComposeView from '../gmail-compose-view';
import makeElementChildStream from '../../../../lib/dom/make-element-child-stream';
import toItemWithLifetimeStream from '../../../../lib/toItemWithLifetimeStream';

export default function getAddressChangesStream(
  gmailComposeView: GmailComposeView
): Kefir.Observable<Object> {
  const recipientRowElements = getRecipientRowElements(
    gmailComposeView.getElement()
  );

  if (!recipientRowElements || recipientRowElements.length === 0) {
    return Kefir.never();
  }

  const mergedStream = Kefir.merge([
    _makeSubAddressStream('to', gmailComposeView),
    _makeSubAddressStream('cc', gmailComposeView),
    _makeSubAddressStream('bcc', gmailComposeView),
  ]);

  const umbrellaStream = mergedStream.map(_groupChangeEvents);

  return Kefir.merge([
    mergedStream,
    umbrellaStream,
    getFromAddressChangeStream(gmailComposeView),
  ]);
}

function readContactFromElement(
  contactNode: HTMLElement,
  addressType: ReceiverType,
  gmailComposeView: GmailComposeView
): Contact | null {
  if (contactNode.getAttribute('role') === 'option') {
    // Handling updated compose recipients
    // https://workspaceupdates.googleblog.com/2021/10/visual-updates-for-composing-email-in-gmail.html
    return {
      name: contactNode.getAttribute('data-name'),
      emailAddress: (contactNode.getAttribute('data-hovercard-id'): any),
    };
  } else {
    return getAddressInformationExtractor(
      addressType,
      gmailComposeView
    )(contactNode);
  }
}

function _makeSubAddressStream(
  addressType: ReceiverType,
  gmailComposeView: GmailComposeView
): Kefir.Observable<{ eventName: string, data: { contact: Contact } }> {
  const contactNodes = gmailComposeView.tagTree.getAllByTag(
    `${addressType}Recipient`
  );

  return toItemWithLifetimeStream(contactNodes).flatMap(
    ({ el, removalStream }) => {
      const contact = readContactFromElement(
        el.getValue(),
        addressType,
        gmailComposeView
      );
      if (!contact) {
        return Kefir.never();
      }
      return Kefir.constant({
        eventName: `${addressType}ContactAdded`,
        data: {
          contact,
        },
      }).merge(
        removalStream.map(() => ({
          eventName: `${addressType}ContactRemoved`,
          data: {
            contact,
          },
        }))
      );
    }
  );
}

function _groupChangeEvents(event) {
  const grouping = {
    to: {
      added: [],
      removed: [],
    },
    cc: {
      added: [],
      removed: [],
    },
    bcc: {
      added: [],
      removed: [],
    },
  };

  const parts = event.eventName.split('Contact'); //splits "toContactAdded" => ["to", "Added"]
  grouping[parts[0]][parts[1].toLowerCase()].push(event.data.contact);

  return {
    eventName: 'recipientsChanged',
    data: grouping,
  };
}

function getFromAddressChangeStream(gmailComposeView) {
  return Kefir.later(0, null).flatMap(() => {
    const fromInput = gmailComposeView
      .getElement()
      .querySelector('input[name="from"]');
    return Kefir.constant(
      _convertToEvent('fromContactChanged', gmailComposeView.getFromContact())
    ).merge(
      !fromInput
        ? Kefir.never()
        : makeMutationObserverStream(fromInput, {
            attributes: true,
            attributeFilter: ['value'],
          }).map(() =>
            _convertToEvent(
              'fromContactChanged',
              gmailComposeView.getFromContact()
            )
          )
    );
  });
}

function _convertToEvent(eventName, addressInfo) {
  return {
    eventName,
    data: {
      contact: addressInfo,
    },
  };
}
