/* @flow */
//jshint ignore:start

import assert from 'assert';
import delay from '../src/common/delay';

import rateLimitQueuer from '../src/common/rate-limit-queuer';

describe("rateLimitQueuer", function() {
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
  it("going over rate limit queues", async function() {
    this.slow();

    let x = 5;
    const fn = rateLimitQueuer(async () => x++, 15, 2);
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
    assert(t6 - t5 < 10);
    assert.strictEqual(await fn(), 10);
    const t7 = Date.now();
    assert(t7 - t6 >= 10);
  });
});
