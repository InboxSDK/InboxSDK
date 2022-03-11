import t from 'transducers.js';

const DEFAULT_ORDER_ATTRS = [
  'data-group-order-hint',
  'data-order-hint',
  'data-insertion-order-hint',
];

export default function insertElementInOrder(
  container: HTMLElement,
  el: HTMLElement,
  orderAttrs: string[] = DEFAULT_ORDER_ATTRS,
  insertBeforeNonSdk: boolean = false
) {
  // get the first element with higher order hints
  const insertBeforeElement = t.toArray(
    Array.prototype.slice.call(container.children),
    t.compose(
      t.filter((cel: HTMLElement) => {
        let hadAnyOrderAttrs = false;
        for (const name of orderAttrs) {
          const attr = el.getAttribute(name);
          const cattr = cel.getAttribute(name);
          if (attr == null || cattr == null) continue;
          hadAnyOrderAttrs = true;
          let comparison;
          if (!isNaN(parseFloat(attr)) && !isNaN(parseFloat(cattr))) {
            comparison = parseFloat(cattr) - parseFloat(attr);
          } else {
            comparison = cattr.localeCompare(attr);
          }
          if (comparison > 0) return true;
          if (comparison < 0) return false;
          // If the elements had equal hint values, then check the next hint.
        }
        if (insertBeforeNonSdk) {
          return !hadAnyOrderAttrs;
        } else {
          return false;
        }
      }),
      t.take(1)
    )
  )[0] as null | HTMLElement;

  container.insertBefore(el, insertBeforeElement);
}
