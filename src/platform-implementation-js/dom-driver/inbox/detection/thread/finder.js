/* @flow */

import _ from 'lodash';
import findParent from '../../../../lib/dom/find-parent';

export default function finder(root: Document=document): Array<HTMLElement> {
  return Array.from(root.querySelectorAll('div[data-item-id^="#gmail:thread-f:"][aria-expanded=true], div.scroll-list-item-open[data-item-id^="#gmail:thread-f:"]'));
}
