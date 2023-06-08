import Logger from '../../../../lib/logger';
import { simulateClick } from '../../../../lib/dom/simulate-mouse-event';
import extractContactFromEmailContactString from '../../../../lib/extract-contact-from-email-contact-string';
import type { Contact } from '../../../../../inboxsdk';
const cache: Record<
  string,
  | {
      headerContact: Contact;
      modalContact: Contact;
    }
  | null
  | undefined
> = {};
export default function getUpdatedContact(
  headerContact: Contact,
  element: HTMLElement
): Contact {
  let cacheEntry = cache[headerContact.emailAddress];

  if (cacheEntry) {
    if (cacheEntry.headerContact.name !== headerContact.name) {
      delete cache[headerContact.emailAddress];
    } else {
      return cacheEntry.modalContact;
    }
  }

  const menuElement = element.querySelector<HTMLElement>('.ajA.SK');
  const isMenuElementHidden =
    menuElement && menuElement.style.visibility === 'hidden';
  const menuButtonElement = element.querySelector<HTMLElement>(
    '.ajy[aria-haspopup=true]'
  );

  if (menuButtonElement && isMenuElementHidden) {
    //the modal that contains this email address is not visible, so we need to bring the modal up
    const block = (event: MouseEvent) => {
      event.stopPropagation();
    };

    const modifyFocusEvent = (event: any) => {
      event.shouldIgnore = true;
    };

    element.addEventListener('click', block);
    document.addEventListener('focus', modifyFocusEvent, true);
    simulateClick(menuButtonElement);

    try {
      updateContactCacheFromModal(headerContact);
    } catch (err) {
      Logger.error(err);
    } finally {
      simulateClick(menuButtonElement);
      element.removeEventListener('click', block);
      document.removeEventListener('focus', modifyFocusEvent, true);
    }

    cacheEntry = cache[headerContact.emailAddress];

    if (cacheEntry) {
      return cacheEntry.modalContact;
    }
  }

  return headerContact;
}

function updateContactCacheFromModal(headerContact: Contact) {
  const spans = document.querySelectorAll('.ajC [email]');

  for (let ii = 0; ii < spans.length; ii++) {
    const span = spans[ii];
    const emailAddress = span.getAttribute('email');
    if (!emailAddress) continue;
    if (cache[emailAddress]) continue;
    let modalContact: Contact = {
      emailAddress,
      name: null!,
    };
    const name = span.getAttribute('name');
    if (name) {
      modalContact.name = name;
    } else {
      const stringContact = extractContactFromEmailContactString(
        span.textContent!
      );

      if (emailAddress === stringContact.emailAddress) {
        modalContact = stringContact;
      }
    }

    cache[emailAddress] = {
      headerContact,
      modalContact,
    };
  }
}
