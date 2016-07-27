/* @flow */

import _ from 'lodash';
import findParent from '../../../../lib/dom/find-parent';

export default function finder(root: Document=document): Array<HTMLElement> {
  return Array.from(root.querySelectorAll('div[aria-expanded=true][data-item-id*="#gmail:thread-f:"], div.scroll-list-item-open[data-item-id*="#gmail:thread-f:"]'));
}
