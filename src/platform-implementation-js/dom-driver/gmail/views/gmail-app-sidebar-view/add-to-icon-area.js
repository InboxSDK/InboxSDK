
/* @flow */

import type OrderManager from 'order-manager';
import {defn} from 'ud';
import findIndex from 'lodash/findIndex';

import insertElementInOrder from '../../../../lib/dom/insert-element-in-order';

function addToIconArea(orderManager: OrderManager<*>, appName: string, container: HTMLElement, iconArea: HTMLElement){
  //first set icon order hints
  [...iconArea.querySelectorAll('[data-app-name]')].forEach(el => {
    const elAppName = el.getAttribute('data-app-name');
    const index = findIndex(orderManager.getOrderedItems(), ({value}) => value.appName === elAppName);
    el.setAttribute('data-order-hint', index);
  });

  const index = findIndex(orderManager.getOrderedItems(), ({value}) => value.appName === appName);
  if(index > -1) container.setAttribute('data-order-hint', index);
  insertElementInOrder(iconArea, container, ['data-order-hint']);
}

export default defn(module, addToIconArea);
