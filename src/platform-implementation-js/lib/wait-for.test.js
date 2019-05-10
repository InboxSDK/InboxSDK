/* @flow */

import waitFor from './wait-for';

test('once', async () => {
  const fn = jest.fn(() => 3);
  expect(await waitFor(fn, 100, 10)).toBe(3);
  expect(fn.mock.calls.length).toBe(1);
});

test('multiple calls', async () => {
  let counter = 0;
  const fn = jest.fn(() => {
    if (++counter > 5) {
      return counter;
    }
  });
  expect(await waitFor(fn, 100, 10)).toBe(6);
  expect(fn.mock.calls.length).toBe(6);
});

test('timeout', async () => {
  const fn = jest.fn(() => false);
  await expect(waitFor(fn, 50, 10)).rejects.toThrowError('waitFor timeout');
  expect(fn.mock.calls.length).toBeGreaterThanOrEqual(1);
  expect(fn.mock.calls.length).toBeLessThanOrEqual(6);
});
