/* @flow */

import _ from 'lodash';

export default function finder(root: Document=document): Array<HTMLElement> {
  const moleComposes = _.filter(
    root.querySelectorAll('div[role=dialog]'),
    el => el.querySelector('div[jsaction^="compose"][jsaction$=".focus_mole"]')
  );
  const inlineComposes = _.toArray(root.querySelectorAll('div[role=main] div[role=list] ~ div div[jslog] div[jsvs]'));
  return _.flatten([moleComposes, inlineComposes]);
}
