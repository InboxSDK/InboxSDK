/* @flow */

import OrderManager from './OrderManager';
import seed from 'seed-random';
import times from 'lodash/times';
import MockStorage from 'mock-webstorage';

afterEach(() => {
  seed.resetGlobal();
});

test('addItem, removeItem', () => {
  const storage: Object = new MockStorage();
  const o = new OrderManager(storage);

  const first = o.getOrderedItems();
  expect(first).toEqual([]);
  o.addItem({
    groupId: 'blah',
    id: 'foo',
    orderHint: 0,
    value: {v: 'foo'}
  });

  const second = o.getOrderedItems();
  expect(second).toEqual([{
    groupId: 'blah',
    id: 'foo',
    orderHint: 0,
    value: {v: 'foo'}
  }]);

  // Make sure we didn't mutate the returned array.
  expect(first).toEqual([]);

  o.removeItem('bar');
  expect(o.getOrderedItems().length).toBe(1);
  o.removeItem('foo');
  expect(o.getOrderedItems().length).toBe(0);

  // Make sure we didn't mutate the returned array.
  expect(second.length).toBe(1);
});

test('orderHint within group is respected', () => {
  const storage: Object = new MockStorage();
  const o = new OrderManager(storage);
  o.addItem({
    groupId: 'planets',
    id: 'mercury',
    orderHint: -1,
    value: {v: 'Mercury'}
  });
  o.addItem({
    groupId: 'planets',
    id: 'earth',
    orderHint: 1,
    value: {v: 'Earth'}
  });
  o.addItem({
    groupId: 'planets',
    id: 'venus',
    orderHint: 0,
    value: {v: 'Venus'}
  });
  o.addItem({
    groupId: 'planets',
    id: 'mars',
    orderHint: 1.1,
    value: {v: 'Mars'}
  });
  expect(o.getOrderedItems().map(x => x.id))
    .toEqual(['mercury', 'venus', 'earth', 'mars']);
});

test('orderHint is not respected across groups', () => {
  const orderedIdsOverMultipleRuns = times(10).map(i => {
    seed(`seed ${i}`, {global: true});

    const storage: Object = new MockStorage();
    const o = new OrderManager(storage);
    o.addItem({
      groupId: 'planets',
      id: 'mercury',
      orderHint: -1,
      value: {v: 'Mercury'}
    });
    o.addItem({
      groupId: 'letters',
      id: 'a',
      orderHint: 0,
      value: {v: 'A'}
    });
    return o.getOrderedItems().map(x => x.id);
  });
  expect(orderedIdsOverMultipleRuns).toMatchSnapshot();
});

test('orderHint is respected within groups but not across groups', () => {
  const orderedIdsOverMultipleRuns = times(10).map(i => {
    seed(`seed ${i}`, {global: true});

    const storage: Object = new MockStorage();
    const o = new OrderManager(storage);
    o.addItem({
      groupId: 'letters',
      id: 'b',
      orderHint: 1,
      value: {v: 'B'}
    });
    o.addItem({
      groupId: 'planets',
      id: 'mercury',
      orderHint: -1,
      value: {v: 'Mercury'}
    });
    o.addItem({
      groupId: 'planets',
      id: 'venus',
      orderHint: 0,
      value: {v: 'Venus'}
    });
    o.addItem({
      groupId: 'letters',
      id: 'a',
      orderHint: 0,
      value: {v: 'A'}
    });

    const orderedItems = o.getOrderedItems();
    expect(orderedItems.findIndex(x => x.id === 'mercury'))
      .toBe(orderedItems.findIndex(x => x.id === 'venus') - 1);
    expect(orderedItems.findIndex(x => x.id === 'a'))
      .toBe(orderedItems.findIndex(x => x.id === 'b') - 1);

    return orderedItems.map(x => x.id);
  });
  expect(orderedIdsOverMultipleRuns).toMatchSnapshot();
});
