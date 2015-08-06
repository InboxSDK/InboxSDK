/* @flow */
// jshint ignore:start

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
    if (contact) {
      return contact.name;
    }
    return this._userEmail;
  }

  getAccountSwitcherContactList(): Contact[] {
    return _.map(
      document.querySelectorAll('div.gb_K a.gb_L div.gb_N'),
      (el: HTMLElement) => ({
        name: el.querySelector('.gb_R').textContent,
        emailAddress: el.querySelector('.gb_S').textContent.match(/\S+/)[0]
      }));
  }

  waitForAccountSwitcherReady(): Promise<void> {
    return waitFor(() => this.getAccountSwitcherContactList().length > 0, 2*1000)
      .catch(err => {
        this._failedWaitFor = true;
        Logger.error(err, {
          reason: "waiting for user account switcher",
          switcherHTML: _.map(
            document.querySelectorAll('div.gb_w'),
            (el: HTMLElement) => censorHTMLstring(el.outerHTML))
        });
      });
  }
}
