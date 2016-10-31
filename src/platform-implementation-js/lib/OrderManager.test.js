/* @flow */

import OrderManager from './OrderManager';
import seed from 'seed-random';
import times from 'lodash/times';
import MockStorage from 'mock-webstorage';

const _originalConsoleError = console.error;
afterEach(() => {
  console.error = _originalConsoleError;
  seed.resetGlobal();
});

test('addItem, removeItem', () => {
  const storage: Object = new MockStorage();
  const o = new OrderManager('k', storage);

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

  o.removeItem('blah', 'bar');
  expect(o.getOrderedItems().length).toBe(1);
  o.removeItem('blah', 'foo');
  expect(o.getOrderedItems().length).toBe(0);

  // Make sure we didn't mutate the returned array.
  expect(second.length).toBe(1);
});

test('orderHint within group is respected', () => {
  const storage: Object = new MockStorage();
  const o = new OrderManager('k', storage);
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

test('handles write fails of localStorage', () => {
  console.error = jest.fn();
  const storage: Object = new MockStorage();
  storage.setItem = () => {
    throw new Error('setItem test failure');
  };
  const o = new OrderManager('k', storage);
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
  expect(o.getOrderedItems().length).toBe(2);
  expect(console.error).toHaveBeenCalledTimes(2);
});

test('handles read fails of localStorage', () => {
  console.error = jest.fn();
  const storage: Object = new MockStorage();
  storage.setItem('k', 'not valid json here');
  const o = new OrderManager('k', storage);
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
  expect(console.error).toHaveBeenCalledTimes(1);
});

test('orderHint is not respected across groups, and picked order persists', () => {
  const orderedIdsOverMultipleRuns = times(10).map(i => {
    seed(`seed ${i}`, {global: true});

    const storage: Object = new MockStorage();
    const o = new OrderManager('k', storage);
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
      value: {v: `A ${i}`}
    });

    const o2 = new OrderManager('k', storage);
    o2.addItem({
      groupId: 'letters',
      id: 'a',
      orderHint: 0,
      value: {v: `A ${i}`}
    });
    o2.addItem({
      groupId: 'planets',
      id: 'mercury',
      orderHint: -1,
      value: {v: 'Mercury'}
    });
    expect(o2.getOrderedItems()).toEqual(o.getOrderedItems());

    return o.getOrderedItems().map(x => x.id);
  });
  expect(orderedIdsOverMultipleRuns).toMatchSnapshot();
});

test('orderHint is respected within groups but not across groups', () => {
  const orderedIdsOverMultipleRuns = times(10).map(i => {
    seed(`seed ${i}`, {global: true});

    const storage: Object = new MockStorage();
    const [orderedItems, orderedItems2] = times(2).map(() => {
      const o = new OrderManager('k', storage);
      o.addItem({
        groupId: 'numbers',
        id: 'two',
        orderHint: 12,
        value: {v: 'Two'}
      });
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
      o.addItem({
        groupId: 'numbers',
        id: 'zero',
        orderHint: 10,
        value: {v: 'Zero'}
      });
      o.addItem({
        groupId: 'numbers',
        id: 'one',
        orderHint: 11,
        value: {v: 'One'}
      });
      return o.getOrderedItems();
    });

    expect(orderedItems2).toEqual(orderedItems);

    expect(orderedItems.findIndex(x => x.id === 'mercury'))
      .toBe(orderedItems.findIndex(x => x.id === 'venus') - 1);
    expect(orderedItems.findIndex(x => x.id === 'a'))
      .toBe(orderedItems.findIndex(x => x.id === 'b') - 1);
    expect(orderedItems.findIndex(x => x.id === 'zero'))
      .toBe(orderedItems.findIndex(x => x.id === 'one') - 1);
    expect(orderedItems.findIndex(x => x.id === 'one'))
      .toBe(orderedItems.findIndex(x => x.id === 'two') - 1);

    return orderedItems.map(x => x.id);
  });
  expect(orderedIdsOverMultipleRuns).toMatchSnapshot();
});

test('handles orderHint being changed from remembered value', () => {
  const orderedItemPairsOverMultipleRuns = times(10).map(i => {
    seed(`seed ${i}`, {global: true});

    const storage: Object = new MockStorage();
    return times(2).map(ii => {
      const plutoBeforeNeptune = ii === 0;

      const o = new OrderManager('k', storage);
      o.addItem({
        groupId: 'letters',
        id: 'b',
        orderHint: 1,
        value: {v: 'B'}
      });
      o.addItem({
        groupId: 'planets',
        id: 'neptune',
        orderHint: 8,
        value: {v: 'Neptune'}
      });
      o.addItem({
        groupId: 'planets',
        id: 'pluto',
        orderHint: plutoBeforeNeptune ? 7.9 : 9,
        value: {v: 'Pluto'}
      });
      o.addItem({
        groupId: 'letters',
        id: 'a',
        orderHint: 0,
        value: {v: 'A'}
      });

      const orderedItems = o.getOrderedItems();
      expect(orderedItems.findIndex(x => x.id === 'a'))
        .toBe(orderedItems.findIndex(x => x.id === 'b') - 1);
      if (plutoBeforeNeptune) {
        expect(orderedItems.findIndex(x => x.id === 'pluto'))
          .toBe(orderedItems.findIndex(x => x.id === 'neptune') - 1);
      } else {
        expect(orderedItems.findIndex(x => x.id === 'neptune'))
          .toBe(orderedItems.findIndex(x => x.id === 'pluto') - 1);
      }
      return orderedItems;
    });
  });
  expect(orderedItemPairsOverMultipleRuns).toMatchSnapshot();
});
