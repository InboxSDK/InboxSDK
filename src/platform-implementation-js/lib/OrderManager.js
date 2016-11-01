/* @flow */

import update from 'react-addons-update';
import findIndex from 'lodash/findIndex';
import findLastIndex from 'lodash/findLastIndex';
import invertBy from 'lodash/invertBy';
import sortBy from 'lodash/sortBy';

export type Item<T> = {
  groupId: string;
  id: string;
  orderHint: number;
  value: T;
};

type PersistedData = {
  order: Array<{
    groupId: string;
    id: string;
    orderHint: number;
    lastUse: number;
  }>;
};

function itemToCombinedId(x: Item<any>) {
  return `${JSON.stringify(x.groupId)}:${JSON.stringify(x.id)}`;
}

export default class OrderManager<T> {
  _key: string;
  _items: Array<Item<T>> = [];
  _storage: Storage;
  _needsSort = false;
  _MAX_ORDER_LENGTH = 200;
  constructor(key: string, storage: Storage=window.localStorage) {
    this._key = key;
    this._storage = storage;
  }
  _read(): PersistedData {
    const str = this._storage.getItem(this._key);
    if (str != null) {
      try {
        return JSON.parse(str);
      } catch(err) {
        console.error('OrderManager failed to parse storage', err);
      }
    }
    return {order: []};
  }
  _save(pdata: PersistedData) {
    if (pdata.order.length > this._MAX_ORDER_LENGTH) {
      const itemsAndIndexes = pdata.order.map((item,index) => ({item, index}));
      const indexesToRemove = sortBy(itemsAndIndexes, x => x.item.lastUse)
        .slice(0, pdata.order.length - this._MAX_ORDER_LENGTH)
        .map(x => x.index);
      const sortedIndexesToRemove = sortBy(indexesToRemove, x => -x);
      pdata = update(pdata, {order: {$splice: sortedIndexesToRemove.map(i => [i, 1])}});
    }

    const str = JSON.stringify(pdata);
    try {
      this._storage.setItem(this._key, str);
    } catch(err) {
      console.error('OrderManager failed to save storage', err);
    }
  }
  _updatePersistedDataWithItem(item: Item<T>): PersistedData {
    let pdata = this._read();

    let ixOfId = findIndex(
      pdata.order,
      x => x.groupId === item.groupId && x.id === item.id
    );

    // If we have persisted pdata for the item id but the orderHint has changed
    // since then, then drop our persisted pdata for the id.
    if (ixOfId !== -1 && pdata.order[ixOfId].orderHint !== item.orderHint) {
      pdata = update(pdata, {order: {$splice: [[ixOfId, 1]]}});
      ixOfId = -1;
    }

    if (ixOfId !== -1) {
      pdata = update(pdata, {order: {$splice: [[ixOfId, 1, {
        groupId: item.groupId,
        id: item.id,
        orderHint: item.orderHint,
        lastUse: Date.now()
      }]]}});
    } else {
      let ixToInsertAt;
      // Try to find an item in the same group with a lower/equal orderHint for
      // us to put the new item after.
      const ixOfLesserOrEqualGroupItem = findLastIndex(
        pdata.order,
        x => x.groupId === item.groupId && x.orderHint <= item.orderHint
      );
      if (ixOfLesserOrEqualGroupItem !== -1) {
        ixToInsertAt = ixOfLesserOrEqualGroupItem+1;
      } else {
        // We didn't find any group items with a lower/equal orderHint. Try to
        // find a group item (which would have a higher orderHint) to put the new
        // item before.
        const ixOfGreaterGroupItem = findIndex(pdata.order, x => x.groupId === item.groupId);
        if (ixOfGreaterGroupItem !== -1) {
          ixToInsertAt = ixOfGreaterGroupItem;
        } else {
          // There weren't any items in the same group to put our new item next
          // to. What we need to do now is put the new item into a random spot in
          // the list, preferably not within an existing continuous group. We do
          // this by finding the first index of each group, and then randomly
          // choose to put the new item before one of them or at the end of the
          // list.

          const groupIdsToIndexes: {[groupId:string]: Array<number>} = invertBy(pdata.order, x => x.groupId);
          const groupIds = Object.keys(groupIdsToIndexes);
          const roll = Math.floor(Math.random()*(groupIds.length+1));
          if (roll === groupIds.length) {
            ixToInsertAt = pdata.order.length;
          } else {
            ixToInsertAt = groupIdsToIndexes[groupIds[roll]][0];
          }
        }
      }

      // Use Flow to check that every path above sets ixToInsertAt.
      (ixToInsertAt: number);

      pdata = update(pdata, {order: {$splice: [[ixToInsertAt, 0, {
        groupId: item.groupId,
        id: item.id,
        orderHint: item.orderHint,
        lastUse: Date.now()
      }]]}});
    }

    this._save(pdata);
    return pdata;
  }
  _sortItemsIfNecessary(pdata: ?PersistedData) {
    if (this._needsSort) {
      if (!pdata) pdata = this._read();
      const idsToIndexes: {[id:string]: Array<number>} = invertBy(pdata.order, itemToCombinedId);
      this._items = sortBy(this._items, item => {
        const id = itemToCombinedId(item);
        return Object.prototype.hasOwnProperty.call(idsToIndexes, id) ?
          idsToIndexes[id][0] : 0;
      });
      this._needsSort = false;
    }
  }
  addItem(item: Item<T>) {
    const pdata = this._updatePersistedDataWithItem(item);
    this._needsSort = true;
    this._items = this._items.concat([item]);
  }
  removeItem(groupId: string, id: string) {
    this._items = this._items.filter(item => item.groupId !== groupId || item.id !== id);
  }
  moveItem(sourceIndex: number, destinationIndex: number) {
    let pdata = this._read();
    this._sortItemsIfNecessary(pdata);
    const source = this._items[sourceIndex];
    const destination = this._items[destinationIndex];
    const sourcePIx = findIndex(pdata.order, item => item.groupId === source.groupId && item.id === source.id);
    const destinationPIx = findIndex(pdata.order, item => item.groupId === destination.groupId && item.id === destination.id);
    pdata = update(pdata, {order: {$splice: [
      [sourcePIx, 1],
      [destinationPIx, 0, pdata.order[sourcePIx]]
    ]}});
    this._save(pdata);
    this._needsSort = true;
  }
  getOrderedItems(): Array<Item<T>> {
    this._sortItemsIfNecessary();
    return this._items;
  }
}
