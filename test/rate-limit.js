/* @flow */

import assert from 'assert';
import delay from 'pdelay';

import rateLimit from '../src/common/rate-limit';

describe("rateLimit", function() {
  it("single call works", function() {
    const fn = rateLimit(() => 5, 15, 2);
    assert.strictEqual(fn(), 5);
  });
  it("multiple calls under limit work", function() {
    let x = 5;
    const fn = rateLimit(() => x++, 15, 2);
    assert.strictEqual(fn(), 5);
    assert.strictEqual(fn(), 6);
  });
  it("going over rate limit throws", function() {
    let x = 5;
    const fn = rateLimit(() => x++, 15, 2);
    assert.strictEqual(fn(), 5);
    assert.strictEqual(fn(), 6);
    assert.throws(fn, /^Error: Function rate limit exceeded$/);
    assert.throws(fn, /^Error: Function rate limit exceeded$/);
  });
  it("multiple calls over longer period works", async function() {
    let x = 5;
    const fn = rateLimit(() => x++, 25, 2);
    assert.strictEqual(fn(), 5);
    assert.strictEqual(fn(), 6);
    assert.throws(fn, /^Error: Function rate limit exceeded$/);
    assert.throws(fn, /^Error: Function rate limit exceeded$/);
    await delay(30);
    assert.strictEqual(fn(), 7);
    assert.strictEqual(fn(), 8);
    assert.throws(fn, /^Error: Function rate limit exceeded$/);
    assert.throws(fn, /^Error: Function rate limit exceeded$/);
  });
  it("multiple rate limits work", function() {
    let x = 5;
    const rawFn = () => x++;
    const fn1 = rateLimit(rawFn, 15, 2);
    const fn2 = rateLimit(rawFn, 15, 3);
    assert.strictEqual(fn1(), 5);
    assert.strictEqual(fn2(), 6);
    assert.strictEqual(fn1(), 7);
    assert.strictEqual(fn2(), 8);
    assert.throws(fn1, /^Error: Function rate limit exceeded$/);
    assert.strictEqual(fn2(), 9);
    assert.throws(fn1, /^Error: Function rate limit exceeded$/);
    assert.throws(fn2, /^Error: Function rate limit exceeded$/);
  });
});
