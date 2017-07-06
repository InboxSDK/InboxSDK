/* @flow */

import assert from 'assert';

import getPrototypeChain from '../src/platform-implementation-js/lib/get-prototype-chain';

describe('getPrototypeChain', function() {
  it('works on single-prototype class', function() {
    class A {}
    const a = new A();
    assert.deepEqual(Array.from(getPrototypeChain(a)), [A.prototype, Object.prototype]);
  });

  it('works with inheritance', function() {
    class A {}
    class B extends A {}
    class C extends B {}
    const c = new C();
    assert.deepEqual(
      Array.from(getPrototypeChain(c)),
      [C.prototype, B.prototype, A.prototype, Object.prototype]
    );
  });
});
