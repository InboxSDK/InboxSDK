/* @flow */

import delay from 'pdelay';

import rateLimitQueuer from './rate-limit-queuer';

// This test is disabled because it depends on timing, and the test doesn't
// handle running on overloaded CI test instances very well. Make sure to
// manually re-enable this (xdescribe -> describe) if you make any changed to
// rateLimitQueuer!
xdescribe('rateLimitQueuer', () => {
  test('single call works', async () => {
    const fn = rateLimitQueuer(async () => 5, 15, 2);
    expect(await fn()).toBe(5);
  });
  test('multiple calls under limit work', async () => {
    let x = 5;
    const fn = rateLimitQueuer(async () => x++, 15, 2);
    const t1 = Date.now();
    expect(await fn()).toBe(5);
    const t2 = Date.now();
    expect(t2 - t1).toBeLessThan(15);
    expect(await fn()).toBe(6);
    const t3 = Date.now();
    expect(t3 - t2).toBeLessThan(15);
  });
  test('going over rate limit sequentially queues', async () => {
    let x = 5;
    const fn = rateLimitQueuer(async () => x++, 30, 2);
    const t1 = Date.now();
    expect(await fn()).toBe(5);
    const t2 = Date.now();
    expect(t2 - t1).toBeLessThan(10);
    expect(await fn()).toBe(6);
    const t3 = Date.now();
    expect(t3 - t2).toBeLessThan(10);

    expect(await fn()).toBe(7);
    const t4 = Date.now();
    expect(t4 - t3).toBeGreaterThanOrEqual(10);
    expect(await fn()).toBe(8);
    const t5 = Date.now();
    expect(t5 - t4).toBeLessThan(10);

    expect(await fn()).toBe(9);
    const t6 = Date.now();
    expect(t6 - t5).toBeGreaterThanOrEqual(10);
    expect(await fn()).toBe(10);
    const t7 = Date.now();
    expect(t7 - t6).toBeLessThan(10);
  });
  test('going over rate limit simultaneously queues', async () => {
    let x = 5;
    const fn = rateLimitQueuer(async () => x++, 100, 2);

    const start = Date.now();
    await Promise.all([
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
    await fn(0);
    await delay(30);
  });
});
