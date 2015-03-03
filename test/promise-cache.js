import assert from 'assert';
import co from 'co';
import _ from 'lodash';
import delay from '../src/common/delay';
import CachingMap from '../src/platform-implementation-js/lib/caching-map';
import MockStorage from './lib/mock-storage';

import PromiseCache from '../src/platform-implementation-js/lib/promise-cache';

describe("PromiseCache", function() {
  it("works like a map for promises", co.wrap(function*() {
    const pc = new PromiseCache();
    pc.set('abc', Promise.resolve(5));
    assert.strictEqual(pc.realValuesMap.has('abc'), false);
    const result = yield pc.get('abc');
    assert.strictEqual(result, 5);
    assert.strictEqual(pc.realValuesMap.has('abc'), true);
  }));

  it("can't store non-promises", function() {
    const pc = new PromiseCache();
    assert.throws(() => {
      pc.set('abc', 5);
    });
    assert.strictEqual(pc.has('abc'), false);
    assert.strictEqual(pc.realValuesMap.has('abc'), false);
  });

  it("clears out rejected promises", co.wrap(function*() {
    const pc = new PromiseCache();
    pc.set('abc', Promise.reject(5));
    assert.strictEqual(pc.has('abc'), true);
    assert.strictEqual(pc.realValuesMap.has('abc'), false);

    let hadError = false;
    try {
      yield pc.get('abc');
    } catch(e) {
      hadError = true;
    }
    assert(hadError);

    assert.strictEqual(pc.has('abc'), false);
    assert.strictEqual(pc.realValuesMap.has('abc'), false);
  }));

  it("works with CachingMap", co.wrap(function*() {
    const storage = new MockStorage();

    {
      const pc1 = new PromiseCache(new CachingMap('foo', {storage, flushTime: 1}));
      pc1.set('abc', Promise.resolve(5));
      assert.strictEqual(pc1.realValuesMap.get('abc'), undefined);
      yield delay(3);
      assert.strictEqual(pc1.realValuesMap.get('abc'), 5);
    }

    {
      const pc2 = new PromiseCache(new CachingMap('foo', {storage, flushTime: 1}));
      assert.strictEqual(yield pc2.get('abc'), 5);
    }
  }));

  it("works with _.memoize", co.wrap(function*() {
    const foo = _.memoize(co.wrap(function*(arg) {
      yield delay(1);
      if (arg % 2 === 0) {
        throw arg;
      }
      return "::"+arg+"::"+Math.random();
    }));
    foo.cache = new PromiseCache();

    const [fooOneA, fooOneB] = yield [foo(1), foo(1)];
    const fooOneC = yield foo(1);
    assert(_.startsWith(fooOneA, '::1::'));
    assert.strictEqual(fooOneB, fooOneA);
    assert.strictEqual(fooOneC, fooOneA);

    const [fooPTwoA, fooPTwoB] = [foo(2), foo(2)];
    assert.strictEqual(fooPTwoB, fooPTwoA);

    let hadError = false;
    try {
      yield fooPTwoA;
    } catch(e) {
      assert.strictEqual(e, 2);
      hadError = true;
    }
    assert(hadError);

    const fooPTwoC = foo(2);
    assert.notEqual(fooPTwoC, fooPTwoA);
    fooPTwoC.catch(_.noop);
  }));
});
