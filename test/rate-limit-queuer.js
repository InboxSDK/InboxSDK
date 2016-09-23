/* @flow */

import assert from 'assert';
import delay from 'pdelay';

import rateLimitQueuer from '../src/common/rate-limit-queuer';

// This test is disabled because it depends on timing, and the test doesn't
// handle running on overloaded CI test instances very well. Make sure to
// manually re-enable this (xdescribe -> describe) if you make any changed to
// rateLimitQueuer!
xdescribe("rateLimitQueuer", function() {
  it("single call works", async function() {
    const fn = rateLimitQueuer(async () => 5, 15, 2);
    assert.strictEqual(await fn(), 5);
  });
  it("multiple calls under limit work", async function() {
    let x = 5;
    const fn = rateLimitQueuer(async () => x++, 15, 2);
    const t1 = Date.now();
    assert.strictEqual(await fn(), 5);
    const t2 = Date.now();
    assert(t2 - t1 < 15);
    assert.strictEqual(await fn(), 6);
    const t3 = Date.now();
    assert(t3 - t2 < 15);
  });
  it("going over rate limit sequentially queues", async function() {
    this.slow();

    let x = 5;
    const fn = rateLimitQueuer(async () => x++, 30, 2);
    const t1 = Date.now();
    assert.strictEqual(await fn(), 5);
    const t2 = Date.now();
    assert(t2 - t1 < 10);
    assert.strictEqual(await fn(), 6);
    const t3 = Date.now();
    assert(t3 - t2 < 10);

    assert.strictEqual(await fn(), 7);
    const t4 = Date.now();
    assert(t4 - t3 >= 10);
    assert.strictEqual(await fn(), 8);
    const t5 = Date.now();
    assert(t5 - t4 < 10);

    assert.strictEqual(await fn(), 9);
    const t6 = Date.now();
    assert(t6 - t5 >= 10);
    assert.strictEqual(await fn(), 10);
    const t7 = Date.now();
    assert(t7 - t6 < 10);
  });
  it("going over rate limit simultaneously queues", async function() {
    this.slow();

    let x = 5;
    const fn = rateLimitQueuer(async () => x++, 100, 2);

    const start = Date.now();
    await Promise.all([
      fn().then(r => {
        assert.strictEqual(r, 5);
        assert(Date.now() - start < 80);
      }),
      fn().then(r => {
        assert.strictEqual(r, 6);
        assert(Date.now() - start < 80);
      }),

      fn().then(r => {
        assert.strictEqual(r, 7);
        assert(Date.now() - start >= 80);
        assert(Date.now() - start < 200);
      }),
      fn().then(r => {
        assert.strictEqual(r, 8);
        assert(Date.now() - start >= 80);
        assert(Date.now() - start < 200);
      }),

      fn().then(r => {
        assert.strictEqual(r, 9);
        assert(Date.now() - start >= 200);
      }),
      delay(15).then(() => fn()).then(r => {
        assert.strictEqual(r, 10);
        assert(Date.now() - start >= 200);
      })
    ]);
  });
  it("recursive rate limited functions work", async function() {
    this.slow();

    let x = 0;
    const fn = rateLimitQueuer(async (expectedX) => {
      assert.strictEqual(expectedX, x);
      x++;
      if (expectedX === 0) {
        await Promise.all([fn(1), fn(2)]);
      }
    }, 15, 2);
    await fn(0);
    await delay(30);
  });
});
