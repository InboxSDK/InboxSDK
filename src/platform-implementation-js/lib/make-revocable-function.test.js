/* @flow */

import makeRevocableFunction from './make-revocable-function';

it('works', () => {
  const adder = {
    value: 0,
    add: (x, y = 0) => {
      adder.value += x + y;
      return adder.value;
    }
  };

  const { fn, revoke } = makeRevocableFunction(adder.add);
  adder.add = fn;

  expect(adder.add(5)).toBe(5);
  expect(adder.add(2, 1)).toBe(8);
  expect(adder.add(3)).toBe(11);
  expect(adder.value).toBe(11);

  revoke();

  expect(adder.add(3)).toBe(undefined);
  expect(adder.value).toBe(11);

  revoke(); // should be no-op

  expect(adder.add(3)).toBe(undefined);
  expect(adder.value).toBe(11);
});

it('revokedFn parameter works', () => {
  const adder = {
    value: 0,
    add: (x, y = 0) => {
      adder.value += x + y;
      return adder.value;
    },
    subtract: (x, y = 0) => {
      adder.value -= x + y;
      return adder.value;
    }
  };

  const { fn, revoke } = makeRevocableFunction(adder.add, adder.subtract);
  adder.add = fn;

  expect(adder.add(5)).toBe(5);
  expect(adder.add(2, 1)).toBe(8);
  expect(adder.add(3)).toBe(11);
  expect(adder.value).toBe(11);

  revoke();

  expect(adder.add(3)).toBe(8);
  expect(adder.value).toBe(8);

  revoke(); // should be no-op

  expect(adder.add(3)).toBe(5);
  expect(adder.value).toBe(5);
});
