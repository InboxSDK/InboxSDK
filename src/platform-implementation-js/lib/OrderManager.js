/* @flow */

import sortedIndexBy from 'lodash/sortedIndexBy';

export type Item<T> = {
  groupId: string;
  id: string;
  orderHint: number;
  value: T;
};
export default class OrderManager<T> {
  _items: Array<Item<T>> = [];
  _storage: Storage;
  constructor(storage: Storage=window.localStorage) {
    this._storage = storage;
  }
  addItem(item: Item<T>) {
    const itemsInSameGroup = this._items.filter(x => x.groupId === item.groupId);
    if (itemsInSameGroup.length === 0) {
      if (Math.random() < 0.5) {
        this._items = [item].concat(this._items);
      } else {
        this._items = this._items.concat([item]);
      }
    } else {
      const ixInGroup = sortedIndexBy(itemsInSameGroup, item, x => x.orderHint);
      let ix;
      if (ixInGroup === 0) {
        const afterItem = itemsInSameGroup[0];
        ix = this._items.indexOf(afterItem);
      } else {
        const beforeItem = itemsInSameGroup[ixInGroup-1];
        ix = this._items.indexOf(beforeItem)+1;
      }
      this._items = this._items.slice(0, ix).concat([item], this._items.slice(ix));
    }
  }
  removeItem(id: string) {
    this._items = this._items.filter(item => item.id !== id);
  }
  getOrderedItems(): Array<Item<T>> {
    return this._items;
  }
}
