/* @flow */

import type GmailComposeView from '../gmail-compose-view';
import Logger from '../../../../lib/logger';
import querySelector from '../../../../lib/dom/querySelectorOrFail';
import getRecipients from './get-recipients';
import { simulateClick } from '../../../../lib/dom/simulate-mouse-event';
import simulateKey from '../../../../lib/dom/simulate-key';
import {
  getRecipientRowForType,
  getOldRecipientRowForType
} from './page-parser';

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

  let _contactRow = getRecipientRowForType(
    gmailComposeView.getElement(),
    addressType
  );

  if (addressType === 'cc') {
    const ccButton = gmailComposeView
      .getElement()
      .querySelector('span.pE[role=link]');
    if (ccButton) {
      ccButton.click();
      _contactRow = getRecipientRowForType(
        gmailComposeView.getElement(),
        addressType
      );
    }
  } else if (addressType === 'bcc') {
    const bccButton = gmailComposeView
      .getElement()
      .querySelector('span.pB[role=link]');
    if (bccButton) {
      bccButton.click();
      _contactRow = getRecipientRowForType(
        gmailComposeView.getElement(),
        addressType
      );
    }
  }

  const contactRow = _contactRow;

  if (contactRow) {
    // new recipient fields
    // https://workspaceupdates.googleblog.com/2021/10/visual-updates-for-composing-email-in-gmail.html

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

    emailAddressEntry.value = '';

    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', emailAddresses.join(','));
    emailAddressEntry.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData })
    );

    // On fresh composes, if set_Recipients is called immediately, then
    // Gmail asynchronously resets the recipients field. Detect this and
    // put our change back.
    const nameEl = contactRow.closest('div.anm[name]');
    if (
      emailAddresses.length > 0 &&
      nameEl &&
      !nameEl.hasAttribute('style') &&
      !nameEl.hasAttribute('data-inboxsdk-handled-reset')
    ) {
      // We're in a fresh compose.

      // If setRecipients is called multiple times on a fresh compose,
      // we only want the last call's setTimeout callback to do anything.
      // Do this by marking a DOM element with a unique claim value and
      // checking for it in the callback. Note that we generate the claim
      // value by reading from the existing DOM value instead of a variable
      // in module scope because there might be multiple extensions using
      // the InboxSDK; we must use the shared DOM as the source of truth
      // for values shared between InboxSDK instances.
      const claim = String(
        Number(
          nameEl.getAttribute('data-inboxsdk-tracking-fresh-compose') || 0
        ) + 1
      );
      nameEl.setAttribute('data-inboxsdk-tracking-fresh-compose', claim);
      setTimeout(() => {
        if (
          nameEl.getAttribute('data-inboxsdk-tracking-fresh-compose') === claim
        ) {
          nameEl.removeAttribute('data-inboxsdk-tracking-fresh-compose');

          // Does it look like our contact chips have all been removed?
          if (
            contactRow.querySelectorAll(
              'div[role=option][data-name] div.afX[aria-label]'
            ).length === 0
          ) {
            // put a mark in the DOM to be absolutely sure we can't
            // get in an infinite loop (which could happen if Gmail doesn't
            // actually set the style attribute, and our selector above fails
            // to find the recipient chips).
            nameEl.setAttribute('data-inboxsdk-handled-reset', 'true');

            setRecipients(gmailComposeView, addressType, emailAddresses);
          }
        }
      }, 100);
    }
  } else {
    // old recipient fields
    let contactRow;
    try {
      contactRow = getOldRecipientRowForType(
        gmailComposeView.getElement(),
        addressType
      );
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
