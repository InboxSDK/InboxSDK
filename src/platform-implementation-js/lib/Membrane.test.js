/* @flow */

import sinon from 'sinon';

import Membrane from './Membrane';

class FooDriver {}
class Foo {
  fooDriver: FooDriver;
  constructor(fooDriver) {
    this.fooDriver = fooDriver;
  }
}

it('works', () => {
  const mappers = [
    [FooDriver, sinon.spy(fooDriver => new Foo(fooDriver))]
  ];
  const membrane = new Membrane(mappers);

  const fd = new FooDriver();
  const f1 = membrane.get(fd);
  expect(f1).toBeInstanceOf(Foo);
  const f2 = membrane.get(fd);
  expect(f2).toBe(f1);
  expect(mappers[0][1].callCount).toBe(1);
});
