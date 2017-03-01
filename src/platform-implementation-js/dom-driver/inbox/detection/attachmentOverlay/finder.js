/* @flow */

import t from 'transducers.js';
import findParent from '../../../../../common/find-parent';

const _t = t.compose(
  t.filter(iframe => iframe.style.display !== 'none'),
  t.mapcat(iframe =>
    Array.from(iframe.contentDocument.querySelectorAll('div[role=dialog]:not([aria-hidden=true])'))
  )
);

export default function finder(root: Document=document): Array<HTMLElement> {
  return t.toArray(Array.from(root.querySelectorAll('iframe[frameborder]:not([src])')), _t);
}
