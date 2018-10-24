/* @flow */

import delay from 'pdelay';

import rateLimit from './rate-limit';

test('single call works', () => {
  const fn = rateLimit(() => 5, 15, 2);
  expect(fn()).toBe(5);
});
test('multiple calls under limit work', () => {
  let x = 5;
  const fn = rateLimit(() => x++, 15, 2);
  expect(fn()).toBe(5);
  expect(fn()).toBe(6);
});
test('going over rate limit throws', () => {
  let x = 5;
  const fn = rateLimit(() => x++, 15, 2);
  expect(fn()).toBe(5);
  expect(fn()).toBe(6);
  expect(fn).toThrowError(/^Function rate limit exceeded$/);
  expect(fn).toThrowError(/^Function rate limit exceeded$/);
});
test('multiple calls over longer period works', async () => {
  let x = 5;
  const fn = rateLimit(() => x++, 25, 2);
  expect(fn()).toBe(5);
  expect(fn()).toBe(6);
  expect(fn).toThrowError(/^Function rate limit exceeded$/);
  expect(fn).toThrowError(/^Function rate limit exceeded$/);
  await delay(30);
  expect(fn()).toBe(7);
  expect(fn()).toBe(8);
  expect(fn).toThrowError(/^Function rate limit exceeded$/);
  expect(fn).toThrowError(/^Function rate limit exceeded$/);
});
test('multiple rate limits work', () => {
  let x = 5;
  const rawFn = () => x++;
  const fn1 = rateLimit(rawFn, 15, 2);
  const fn2 = rateLimit(rawFn, 15, 3);
  expect(fn1()).toBe(5);
  expect(fn2()).toBe(6);
  expect(fn1()).toBe(7);
  expect(fn2()).toBe(8);
  expect(fn1).toThrowError(/^Function rate limit exceeded$/);
  expect(fn2()).toBe(9);
  expect(fn1).toThrowError(/^Function rate limit exceeded$/);
  expect(fn2).toThrowError(/^Function rate limit exceeded$/);
});
