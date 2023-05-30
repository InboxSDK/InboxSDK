import find from 'lodash/find';
import uniqBy from 'lodash/uniqBy';
import { Driver } from '../../../driver-interfaces/driver';
import { Contact } from '../../../../inboxsdk';

export default class UserInfo {
  _failedWaitFor: boolean;
  _userEmail: string;

  constructor(driver: Driver) {
    this._failedWaitFor = false;
    this._userEmail = driver.getUserEmailAddress();
  }

  // deprecated
  getUserName(): string {
    const nameEl = document.querySelector<HTMLElement>(
      'div.gb_w div.gb_B .gb_D'
    );
    if (nameEl) {
      return nameEl.textContent!;
    }
    const contact: Contact = find(
      this.getAccountSwitcherContactList(),
      (contact: Contact) => contact.emailAddress === this._userEmail
    )!;
    if (contact && contact.name != null) {
      return contact.name;
    }
    return this._userEmail;
  }

  /* @deprecated */
  getAccountSwitcherContactList(): Contact[] {
    const main: Contact[] = Array.from(
      document.querySelectorAll<HTMLElement>(
        '[role=banner] div[aria-label] div div a[href^="https://myaccount.google."]'
      )
    )
      .slice(0, 1)
      .map((btn: HTMLElement) => {
        const btnParent: HTMLElement = btn.parentElement!;
        const nameEl = btnParent.children[0];
        const emailAddressEl = btnParent.children[1];
        if (!nameEl || !emailAddressEl) return null;
        return {
          name: nameEl.textContent,
          emailAddress: emailAddressEl.textContent,
        };
      })
      .filter(Boolean) as Contact[];
    const extras: Contact[] = Array.from(
      document.querySelectorAll<HTMLElement>(
        '[role=banner] div[aria-label] div > a[target="_blank"] > img + div'
      )
    ).map((el: HTMLElement) => {
      const match = el.children[1].textContent!.match(/\S+/);
      if (!match) {
        throw new Error('Failed to match');
      }
      return {
        name: el.children[0].textContent!,
        emailAddress: match[0],
      };
    });
    return uniqBy(main.concat(extras), (x) => x.emailAddress.toLowerCase());
  }
}
