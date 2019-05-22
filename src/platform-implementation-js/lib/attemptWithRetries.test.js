/* @flow */

import attemptWithRetries from './attemptWithRetries';

test('works', async () => {
  const fn = jest.fn(async () => 123);
  expect(await attemptWithRetries(fn, 3, () => true)).toBe(123);
  expect(fn.mock.calls.length).toBe(1);
});

test('works with 1 attempt', async () => {
  const fn = jest.fn(async () => 123);
  expect(await attemptWithRetries(fn, 1, () => true)).toBe(123);
  expect(fn.mock.calls.length).toBe(1);
});

test('fails with 0 attempts', async () => {
  const fn = jest.fn(async () => 123);
  await expect(attemptWithRetries(fn, 0, () => true)).rejects.toThrowError(
    'Attempt count must be positive'
  );
  expect(fn.mock.calls.length).toBe(0);
});

test('retries', async () => {
  let i = 0;
  const fn = jest.fn(async () => {
    if (++i < 3) {
      throw new Error('test: i too low');
    }
    return 123;
  });
  expect(await attemptWithRetries(fn, 3, () => true)).toBe(123);
  expect(fn.mock.calls.length).toBe(3);
});

test('retries can fail', async () => {
  let i = 0;
  const fn = jest.fn(async () => {
    throw new Error('test: i too low');
  });
  await expect(attemptWithRetries(fn, 3, () => true)).rejects.toThrowError(
    'test: i too low'
  );
  expect(fn.mock.calls.length).toBe(3);
});
