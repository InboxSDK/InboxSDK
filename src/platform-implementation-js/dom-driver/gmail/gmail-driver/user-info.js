/* @flow */

import _ from 'lodash';
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
    var nameEl = document.querySelector('div.gb_w div.gb_B .gb_D');
    if (nameEl) {
      return nameEl.textContent;
    }
    var contact: Contact = _.find(
      this.getAccountSwitcherContactList(),
      (contact: Contact) => contact.emailAddress === this._userEmail);
    if (contact && contact.name != null) {
      return contact.name;
    }
    return this._userEmail;
  }

  getAccountSwitcherContactList(): Contact[] {
    var main: Contact[] = _.chain(document.querySelectorAll('[role=banner] div[aria-label] div div a[href^="https://myaccount.google."]'))
      .take(1)
      .map((btn: HTMLElement) => {
        var btnParent: HTMLElement = (btn:any).parentElement;
        var nameEl = btnParent.children[0];
        var emailAddressEl = btnParent.children[1];
        if (!nameEl || !emailAddressEl) return null;
        return {
          name: nameEl.textContent,
          emailAddress: emailAddressEl.textContent
        };
      })
      .filter()
      .value();
    var extras: Contact[] = _.map(
      document.querySelectorAll('[role=banner] div[aria-label] div > a[target="_blank"] > img + div'),
      (el: HTMLElement) => {
        const match = el.children[1].textContent.match(/\S+/);
        if (!match) {
          throw new Error("Failed to match");
        }
        return {
          name: el.children[0].textContent,
          emailAddress: match[0]
        };
      });
    return _.chain([main, extras]).flatten().uniqBy(x => x.emailAddress.toLowerCase()).value();
  }

  waitForAccountSwitcherReady(): Promise<void> {
    return waitFor(() => this.getAccountSwitcherContactList().length > 0, 10*1000)
      .then(() => undefined)
      .catch(err => {
        this._failedWaitFor = true;
        Logger.error(err, {
          reason: "waiting for user account switcher",
          switcherHTML: _.map(
            document.querySelectorAll('div.gb_w[aria-label], div.gb_va[aria-label]'),
            (el: HTMLElement) => censorHTMLstring(el.outerHTML))
        });
      });
  }
}
