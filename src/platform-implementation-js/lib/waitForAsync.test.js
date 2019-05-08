/* @flow */

import waitForAsync from './waitForAsync';

test('once', async () => {
  const fn = jest.fn(async () => 3);
  expect(await waitForAsync(fn, 100, 10)).toBe(3);
  expect(fn.mock.calls.length).toBe(1);
});

test('multiple calls', async () => {
  let counter = 0;
  const fn = jest.fn(async () => {
    if (++counter > 5) {
      return counter;
    }
  });
  expect(await waitForAsync(fn, 100, 10)).toBe(6);
  expect(fn.mock.calls.length).toBe(6);
});

test('timeout', async () => {
  const fn = jest.fn(async () => false);
  await expect(waitForAsync(fn, 50, 10)).rejects.toThrowError(
    'waitForAsync timeout'
  );
  expect(fn.mock.calls.length).toBeGreaterThan(2);
  expect(fn.mock.calls.length).toBeLessThanOrEqual(6);
});
