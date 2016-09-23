/* @flow */

import assert from 'assert';
import sinon from 'sinon';
import delay from 'pdelay';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import arrayToLifetimes from '../src/platform-implementation-js/lib/array-to-lifetimes';

import ItemWithLifetimePool from '../src/platform-implementation-js/lib/ItemWithLifetimePool';

describe('ItemWithLifetimePool', function() {
  it('emits items currently in pool asynchronously', async function() {
    const bus = kefirBus();
    const s = arrayToLifetimes(bus);
    const p = new ItemWithLifetimePool(s);

    bus.emit(['a', 'b']);
    bus.emit(['a', 'c', 'd']);

    const spy = sinon.spy();
    p.items().onValue(spy);

    assert.equal(spy.callCount, 0);

    await delay(1);

    assert.equal(spy.callCount, 3);
    assert.deepEqual(spy.args.map(args => args[0].el), ['a', 'c', 'd']);
    assert.deepEqual(p.currentItemWithLifetimes().map(({el}) => el), ['a', 'c', 'd']);
  });

  it('handles items removed from pool immediately after subscribe', async function() {
    const bus = kefirBus();
    const s = arrayToLifetimes(bus);
    const p = new ItemWithLifetimePool(s);

    bus.emit(['a', 'b']);

    const spy = sinon.spy();
    p.items().onValue(spy);
    bus.emit(['a']);

    assert.equal(spy.callCount, 0);

    await delay(1);

    assert.equal(spy.callCount, 1);
    assert.deepEqual(spy.args.map(args => args[0].el), ['a']);
  });

  it('handles items added to pool immediately after subscribe', async function() {
    const bus = kefirBus();
    const s = arrayToLifetimes(bus);
    const p = new ItemWithLifetimePool(s);

    bus.emit(['a', 'b']);

    const spy = sinon.spy();
    p.items().onValue(spy);
    bus.emit(['a', 'b', 'c']);

    assert.equal(spy.callCount, 0);

    await delay(1);

    assert.equal(spy.callCount, 3);
    assert.deepEqual(spy.args.map(args => args[0].el), ['a', 'b', 'c']);
  });

  it("emits items as they're added to the pool", async function() {
    const bus = kefirBus();
    const s = arrayToLifetimes(bus);
    const p = new ItemWithLifetimePool(s);

    const spy = sinon.spy();
    const endSpy = sinon.spy();
    p.items().onValue(spy).onEnd(endSpy);

    await delay(1);

    assert.equal(spy.callCount, 0);

    bus.emit(['a']);

    assert.equal(spy.callCount, 1);
    assert.deepEqual(spy.args.map(args => args[0].el), ['a']);

    const aRemoveSpy = sinon.spy();
    spy.args[0][0].removalStream.onValue(aRemoveSpy);

    bus.emit(['a', 'b']);

    assert.equal(aRemoveSpy.callCount, 0);
    assert.equal(spy.callCount, 2);
    assert.deepEqual(spy.args.map(args => args[0].el), ['a', 'b']);

    bus.emit(['b', 'c']);

    assert.equal(aRemoveSpy.callCount, 1);
    assert.equal(spy.callCount, 3);
    assert.deepEqual(spy.args.map(args => args[0].el), ['a', 'b', 'c']);

    assert.equal(endSpy.callCount, 0);
    bus.end();
    assert.equal(endSpy.callCount, 1);
  });
});
