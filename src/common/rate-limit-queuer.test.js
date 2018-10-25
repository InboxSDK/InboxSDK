/* @flow */

import delay from 'pdelay';

import rateLimitQueuer from './rate-limit-queuer';

jest.useFakeTimers();

const _originalDateNow = Date.now;

beforeEach(() => {
  const start = _originalDateNow.call(Date);
  (Date: any).now = () => start;
});

function advancePromises(): Promise<void> {
  return Promise.resolve().then(() => Promise.resolve());
}

function advanceTimers(time: number) {
  const newTime = Date.now() + time;
  (Date: any).now = () => newTime;
  jest.advanceTimersByTime(time);
}

test('single call works', async () => {
  const fn = rateLimitQueuer(async () => 5, 15, 2);
  expect(await fn()).toBe(5);
});
test('multiple calls under limit work', async () => {
  let x = 5;
  const fn = rateLimitQueuer(async () => x++, 15, 2);
  expect(await fn()).toBe(5);
  expect(await fn()).toBe(6);
});
test('going over rate limit sequentially queues', async () => {
  let x = 5;
  const fn = rateLimitQueuer(async () => x++, 30, 2);
  expect(await fn()).toBe(5);
  expect(await fn()).toBe(6);

  const callSeven = fn();
  const callSevenCb = jest.fn();
  callSeven.then(callSevenCb, callSevenCb);
  await advancePromises();
  expect(callSevenCb).not.toBeCalled();

  advanceTimers(30);

  expect(await callSeven).toBe(7);
  expect(await fn()).toBe(8);

  const callNine = fn();
  const callNineCb = jest.fn();
  callNine.then(callNineCb, callNineCb);
  await advancePromises();
  expect(callNineCb).not.toBeCalled();

  advanceTimers(30);

  expect(await callNine).toBe(9);
  expect(await fn()).toBe(10);
});
test('going over rate limit simultaneously queues', async () => {
  let x = 5;
  const fn = rateLimitQueuer(async () => x++, 100, 2);

  const start = Date.now();
  const p = Promise.all([
    fn().then(r => {
      expect(r).toBe(5);
      expect(Date.now() - start).toBeLessThan(80);
    }),
    fn().then(r => {
      expect(r).toBe(6);
      expect(Date.now() - start).toBeLessThan(80);
    }),

    fn().then(r => {
      expect(r).toBe(7);
      expect(Date.now() - start).toBeGreaterThanOrEqual(80);
      expect(Date.now() - start).toBeLessThan(200);
    }),
    fn().then(r => {
      expect(r).toBe(8);
      expect(Date.now() - start).toBeGreaterThanOrEqual(80);
      expect(Date.now() - start).toBeLessThan(200);
    }),

    fn().then(r => {
      expect(r).toBe(9);
      expect(Date.now() - start).toBeGreaterThanOrEqual(200);
    }),
    delay(15)
      .then(() => fn())
      .then(r => {
        expect(r).toBe(10);
        expect(Date.now() - start).toBeGreaterThanOrEqual(200);
      })
  ]);
  for (let i=0; i<20; i++) {
    advanceTimers(50);
    await advancePromises();
  }
  await p;
});
test('recursive rate limited functions work', async () => {
  let x = 0;
  const fn = rateLimitQueuer(
    async expectedX => {
      expect(expectedX).toBe(x);
      x++;
      if (expectedX === 0) {
        await Promise.all([fn(1), fn(2)]);
      }
    },
    15,
    2
  );
  const zeroCall = fn(0);
  const zeroCallCb = jest.fn();
  zeroCall.then(zeroCallCb, zeroCallCb);
  await advancePromises();
  expect(zeroCallCb).not.toBeCalled();

  advanceTimers(50);
  await zeroCall;
  expect(zeroCallCb).toBeCalled();
});
