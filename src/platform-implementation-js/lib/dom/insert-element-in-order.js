/* @flow */

import t from 'transducers.js';
import isNumber from 'isnumber';

const DEFAULT_ORDER_ATTRS = ['data-group-order-hint', 'data-order-hint', 'data-insertion-order-hint'];

export default function insertElementInOrder(container: HTMLElement, el: HTMLElement, orderAttrs: string[]=DEFAULT_ORDER_ATTRS) {
  // get the first element with higher order hints
  const insertBeforeElement: ?HTMLElement = t.toArray(container.children, t.compose(
    t.filter((cel: HTMLElement) => {
      for (let name of orderAttrs) {
        const attr = el.getAttribute(name);
        const cattr = cel.getAttribute(name);
        if (attr == null || cattr == null) continue;
        let comparison;
        if (isNumber(attr) && isNumber(cattr)) {
          comparison = parseFloat(cattr) - parseFloat(attr);
        } else {
          comparison = cattr.localeCompare(attr);
        }
        if (comparison > 0) return true;
        if (comparison < 0) return false;
        // If the elements had equal hint values, then check the next hint.
      }
      return false;
    }),
    t.take(1)
  ))[0];

  container.insertBefore(el, insertBeforeElement);
}
