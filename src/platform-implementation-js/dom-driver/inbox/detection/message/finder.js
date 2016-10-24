/* @flow */

import _ from 'lodash';
import findParent from '../../../../../common/find-parent';

export default function finder(root: Document=document): Array<HTMLElement> {
  return Array.from(root.querySelectorAll(
    'div[role=listitem][aria-expanded][data-msg-id*="msg-"]'
  ));
}
