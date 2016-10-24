/* @flow */

import _ from 'lodash';
import findParent from '../../../../../common/find-parent';

export default function finder(root: Document=document): Array<HTMLElement> {
  return _.chain(Array.from(root.querySelectorAll('iframe[frameborder]:not([src])')))
    .filter(iframe => iframe.style.display !== 'none')
    .flatMap(iframe =>
      Array.from(iframe.contentDocument.querySelectorAll('div[role=dialog]:not([aria-hidden=true])'))
    )
    .value();
}
