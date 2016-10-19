/* @flow */

let randomOverride: ?number = null;
jest.mock('lodash/random', () => {
  const actualRandom = require.requireActual('lodash/random');
  return function(...args) {
    if (randomOverride != null) return randomOverride;
    return actualRandom(...args);
  };
});

import {getId, createId, _reset} from './idMap';

afterEach(() => {
  randomOverride = null;
  _reset();
});

test('createId, getId works', () => {
  const a = createId('aleph');
  const b = createId('bet');
  expect(a).not.toBe(b);
  expect(typeof a).toBe('string');
  expect(typeof b).toBe('string');

  expect(getId('aleph')).toBe(a);
  expect(getId('bet')).toBe(b);
  expect(getId('aleph')).toBe(a);
});

test('createId can run with existing name', () => {
  const a1 = createId('aleph');
  const a2 = createId('aleph');
  expect(a1).toBe(a2);
});

test('getId throws if given non-existing name', () => {
  expect(() => {
    getId('aleph');
  }).toThrowError('Name not found in idMap: aleph');
});

test('ids do not contain digits and are at least 6 characters', () => {
  for (let i=0; i<10; i++) {
    const id = createId(`foo${i}`);
    expect(/[0-9]/.test(id)).toBe(false);
    expect(id.length).toBeGreaterThanOrEqual(6);
  }

  randomOverride = 0x100000;

  for (let i=0; i<30; i++) {
    const id = createId(`bar${i}`);
    expect(/[0-9]/.test(id)).toBe(false);
    expect(id.length).toBeGreaterThanOrEqual(6);
    randomOverride++;
  }
});

test('still gives unique ids if it get a repeated random number', () => {
  randomOverride = 0x100000;

  const ids = new Set();
  for (let i=0; i<10; i++) {
    const id = createId(`foo${i}`);
    expect(ids.has(id)).toBe(false);
    ids.add(id);
  }
});
