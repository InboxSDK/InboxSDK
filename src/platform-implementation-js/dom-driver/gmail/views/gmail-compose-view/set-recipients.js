/* @flow */

import type GmailComposeView from '../gmail-compose-view';
import Logger from '../../../../lib/logger';
import querySelector from '../../../../lib/dom/querySelectorOrFail';
import getRecipients from './get-recipients';
import { simulateClick } from '../../../../lib/dom/simulate-mouse-event';
import simulateKey from '../../../../lib/dom/simulate-key';

const ADDRESS_TYPES = ['to', 'cc', 'bcc'];

export default function setRecipients(
  gmailComposeView: GmailComposeView,
  addressType: ReceiverType,
  emailAddresses: string[]
) {
  if (_areContactsEqual(gmailComposeView, addressType, emailAddresses)) {
    return;
  }

  let oldRange;

  let contactRow = gmailComposeView.getRecipientRowForType(addressType);

  // <span id=":8l" class="aB gQ pE" role="link" tabindex="1" data-tooltip="Add Cc recipients ‪(⌘⇧C)‬" aria-label="Add Cc recipients ‪(⌘⇧C)‬" style="user-select: none; display: none;">Cc</span>
  // <span id=":8m" class="aB  gQ pB" role="link" tabindex="1" data-tooltip="Add Bcc recipients ‪(⌘⇧B)‬" aria-label="Add Bcc recipients ‪(⌘⇧B)‬" style="user-select: none;">Bcc</span>
  if (addressType === 'cc') {
    const ccButton = gmailComposeView
      .getElement()
      .querySelector('span.pE[role=link]');
    if (ccButton) {
      ccButton.click();
      contactRow = gmailComposeView.getRecipientRowForType(addressType);
    }
  } else if (addressType === 'bcc') {
    const bccButton = gmailComposeView
      .getElement()
      .querySelector('span.pB[role=link]');
    if (bccButton) {
      bccButton.click();
      contactRow = gmailComposeView.getRecipientRowForType(addressType);
    }
  }

  if (contactRow) {
    // new stuff

    const emailAddressEntry = querySelector(
      contactRow,
      'input[role=combobox][aria-autocomplete=list]'
    );
    if (!(emailAddressEntry instanceof HTMLInputElement)) {
      throw new Error();
    }

    oldRange = gmailComposeView.getLastSelectionRange();

    // Remove existing recipients
    Array.from(
      contactRow.querySelectorAll(
        'div[role=option][data-name] div.afX[aria-label]'
      )
    ).forEach(el => {
      el.click();
    });

    emailAddressEntry.value = emailAddresses.join(',');
    simulateKey(emailAddressEntry, 13, 0);

    // Focus the recipients preview label so Gmail re-renders it.
    // const cover = querySelector(gmailComposeView.getElement(), 'div.aoD.hl');
    // cover.dispatchEvent(new FocusEvent('focus'));
  } else {
    // old stuff
    let contactRow;
    try {
      contactRow = gmailComposeView.getOldRecipientRowForType(addressType);
      if (!contactRow) {
        throw new Error('getOldRecipientRowForType failed');
      }
    } catch (err) {
      Logger.error(err, { addressType });
      return;
    }

    const emailAddressEntry = contactRow.querySelector('textarea.vO');

    if (
      !emailAddressEntry ||
      !(emailAddressEntry instanceof HTMLTextAreaElement)
    ) {
      return;
    }

    // Remove existing recipients
    Array.from(contactRow.querySelectorAll('.vR .vM')).forEach(el => {
      simulateClick(el);
    });

    emailAddressEntry.value = emailAddresses.join(',');

    // Push enter so Gmail interprets the addresses.
    simulateKey(emailAddressEntry, 13, 0);

    oldRange = gmailComposeView.getLastSelectionRange();

    // Focus the recipients preview label so Gmail re-renders it.
    const cover = querySelector(gmailComposeView.getElement(), 'div.aoD.hl');
    cover.dispatchEvent(new FocusEvent('focus'));

    if (addressType === 'cc') {
      const ccButton = querySelector(
        gmailComposeView.getElement(),
        'span.aB.gQ.pE'
      );
      simulateClick(ccButton);
    } else if (addressType === 'bcc') {
      const bccButton = querySelector(
        gmailComposeView.getElement(),
        'span.aB.gQ.pB'
      );
      simulateClick(bccButton);
    }
  }

  // Then restore focus to what it was before.
  if (document.activeElement) {
    document.activeElement.blur();
  }
  if (oldRange) {
    const sel = document.getSelection();
    if (!sel) throw new Error();
    sel.removeAllRanges();
    sel.addRange(oldRange);
  }
}

function _areContactsEqual(
  gmailComposeView,
  addressType: ReceiverType,
  emailAddresses
) {
  let existingEmailAddresses = getRecipients(gmailComposeView, addressType).map(
    c => c.emailAddress
  );

  if (!emailAddresses) {
    return !!existingEmailAddresses;
  }

  if (!existingEmailAddresses) {
    return !!emailAddresses;
  }

  if (emailAddresses.length !== existingEmailAddresses.length) {
    return false;
  }

  for (let ii = 0; ii < existingEmailAddresses.length; ii++) {
    let existingEmailAddress = existingEmailAddresses[ii];

    if (emailAddresses.indexOf(existingEmailAddress) === -1) {
      return false;
    }
  }

  return true;
}
