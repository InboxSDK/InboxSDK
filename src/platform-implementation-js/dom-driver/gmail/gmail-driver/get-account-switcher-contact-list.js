/* @flow */
// jshint ignore:start

import _ from 'lodash';

export default function getAccountSwitcherContactList(): Contact[] {
  return _.map(
    document.querySelectorAll('div.gb_K a.gb_L div.gb_N'),
    (el: HTMLElement) => ({
      name: el.querySelector('.gb_R').textContent,
      emailAddress: el.querySelector('.gb_S').textContent.match(/\S+/)[0]
    }));
}
