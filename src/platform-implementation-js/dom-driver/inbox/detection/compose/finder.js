/* @flow */

import _ from 'lodash';
import findParent from '../../../../../common/find-parent';

export default function finder(root: Document=document): Array<HTMLElement> {
  const moleComposes = _.filter(
    root.querySelectorAll('div[role=dialog]'),
    el => el.querySelector('div[jsaction^="compose"][jsaction$=".focus_mole"]')
  );

  const inlineComposesByPopoutBtn =_.chain(root.querySelectorAll('div[role=main] div[role=list] ~ div div[jslog] div[jsvs] > button, div[role=main] div[role=listitem][aria-multiselectable] div[jslog] div[jsvs] > button'))
    .filter(el => el.style.display !== 'none')
    .map(el => findParent(el, el => el.hasAttribute('jsvs')))
    .value();

  const inlineComposesByBody = _.chain(root.querySelectorAll('div[role=main] div[role=list] ~ div div[jsvs] div[role=textbox][contenteditable=true][tabindex="0"], div[role=main] div[role=listitem][aria-multiselectable] div[jsvs] div[role=textbox][contenteditable=true][tabindex="0"]'))
    .map(el => findParent(el, el => el.hasAttribute('jsvs')))
    .value();

  const inlineComposes = _.chain([inlineComposesByPopoutBtn, inlineComposesByBody])
    .flatten()
    .uniq()
    .value();

  return _.flatten([moleComposes, inlineComposes]);
}
