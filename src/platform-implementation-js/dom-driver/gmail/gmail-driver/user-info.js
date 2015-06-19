/* @flow */
// jshint ignore:start

import _ from 'lodash';
import Logger from '../../../lib/logger';

export function getUserName(): string {
  var nameEl = document.querySelector('div.gb_K a.gb_L div.gb_N .gb_R')
  if (nameEl) {
    return nameEl.textContent;
  } else {
    Logger.error(new Error("Failed to read user's name"));
    return 'undefined';
  }
}

export function getAccountSwitcherContactList(): Contact[] {
  return _.map(
    document.querySelectorAll('div.gb_K a.gb_L div.gb_N'),
    (el: HTMLElement) => ({
      name: el.querySelector('.gb_R').textContent,
      emailAddress: el.querySelector('.gb_S').textContent.match(/\S+/)[0]
    }));
}
