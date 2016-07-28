/* @flow */
//jshint ignore:start

var _ = require('lodash');
var isNumber = require('isnumber');

var DEFAULT_ORDER_ATTRS = ['data-group-order-hint', 'data-order-hint', 'data-insertion-order-hint'];

export default function insertElementInOrder(container: HTMLElement, el: HTMLElement, orderAttrs: string[]=DEFAULT_ORDER_ATTRS) {
  // get the first element with higher order hints
  var insertBeforeElement: ?HTMLElement = _.chain(container.children)
    .filter(cel => {
      for (var name of orderAttrs) {
        if (!el.hasAttribute(name) || !cel.hasAttribute(name)) continue;
        var attr = el.getAttribute(name);
        var cattr = cel.getAttribute(name);
        var comparison;
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
    })
    .head()
    .value();

  container.insertBefore(el, (insertBeforeElement:any));
}
