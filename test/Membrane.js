/* @flow */

import assert from 'assert';
import sinon from 'sinon';

import Membrane from '../src/platform-implementation-js/lib/Membrane';

class FooDriver {}
class Foo {
  fooDriver: FooDriver;
  constructor(fooDriver) {
    this.fooDriver = fooDriver;
  }
}

describe('Membrane', function() {
  it('works', function() {
    const mappers = [
      [FooDriver, sinon.spy(fooDriver => new Foo(fooDriver))]
    ];
    const membrane = new Membrane(mappers);

    const fd = new FooDriver();
    const f1 = membrane.get(fd);
    assert(f1 instanceof Foo);
    const f2 = membrane.get(fd);
    assert.strictEqual(f2, f1);
    assert.strictEqual(mappers[0][1].callCount, 1);
  });
});
