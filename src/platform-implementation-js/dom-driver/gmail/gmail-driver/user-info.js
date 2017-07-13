/* @flow */

import find from 'lodash/find';
import uniqBy from 'lodash/uniqBy';
import censorHTMLstring from '../../../../common/censor-html-string';
import Logger from '../../../lib/logger';
import waitFor from '../../../lib/wait-for';

export default class UserInfo {
  _failedWaitFor: boolean;
  _userEmail: string;

  constructor(driver: Object) {
    this._failedWaitFor = false;
    this._userEmail = driver.getUserEmailAddress();
  }

  // deprecated
  getUserName(): string {
    const nameEl = document.querySelector('div.gb_w div.gb_B .gb_D');
    if (nameEl) {
      return nameEl.textContent;
    }
    const contact: Contact = find(
      this.getAccountSwitcherContactList(),
      (contact: Contact) => contact.emailAddress === this._userEmail);
    if (contact && contact.name != null) {
      return contact.name;
    }
    return this._userEmail;
  }

  getAccountSwitcherContactList(): Contact[] {
    const main: Contact[] = Array.from(document.querySelectorAll('[role=banner] div[aria-label] div div a[href^="https://myaccount.google."]'))
      .slice(0, 1)
      .map((btn: HTMLElement) => {
        const btnParent: HTMLElement = (btn:any).parentElement;
        const nameEl = btnParent.children[0];
        const emailAddressEl = btnParent.children[1];
        if (!nameEl || !emailAddressEl) return null;
        return {
          name: nameEl.textContent,
          emailAddress: emailAddressEl.textContent
        };
      })
      .filter(Boolean);
    const extras: Contact[] = Array.from(
      document.querySelectorAll('[role=banner] div[aria-label] div > a[target="_blank"] > img + div')
    ).map((el: HTMLElement) => {
      const match = el.children[1].textContent.match(/\S+/);
      if (!match) {
        throw new Error("Failed to match");
      }
      return {
        name: el.children[0].textContent,
        emailAddress: match[0]
      };
    });
    return uniqBy(main.concat(extras), x => x.emailAddress.toLowerCase());
  }

  waitForAccountSwitcherReady(): Promise<void> {
    return waitFor(() => this.getAccountSwitcherContactList().length > 0, 10*1000)
      .then(() => undefined)
      .catch(err => {
        this._failedWaitFor = true;
        Logger.error(err, {
          reason: "waiting for user account switcher",
          switcherHTML: Array.from(
            document.querySelectorAll('div.gb_w[aria-label], div.gb_va[aria-label]')
          ).map((el: HTMLElement) => censorHTMLstring(el.outerHTML))
        });
      });
  }
}
