/* @flow */
//jshint ignore:start

var _ = require('lodash');

// Find the first element with a higher orderHint
export default function getInsertBeforeElement(container: HTMLElement, checkOrderHint: number, checkGroupOrderHint: string=''): ?HTMLElement {
  return _.chain(container.children)
    .filter(el => {
      var orderHint = parseInt(el.getAttribute('data-order-hint'), 10);
      if (Number.isNaN(orderHint)) return false;
      var groupOrderHint = el.getAttribute('data-group-order-hint') || '';
      return groupOrderHint > checkGroupOrderHint || (groupOrderHint === checkGroupOrderHint && orderHint > checkOrderHint);
    })
    .first()
    .value();
}
