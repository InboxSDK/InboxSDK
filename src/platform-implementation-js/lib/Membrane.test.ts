import sinon from 'sinon';

import Membrane, { Mapper } from './Membrane';

class FooDriver {}
class Foo {
  fooDriver: FooDriver;
  constructor(fooDriver: FooDriver) {
    this.fooDriver = fooDriver;
  }
}

it('works', () => {
  const fn = sinon.spy((fooDriver: FooDriver) => new Foo(fooDriver));
  const mappers: Mapper<typeof FooDriver>[] = [[FooDriver, fn]];
  const membrane = new Membrane(mappers);

  const fd = new FooDriver();
  const f1 = membrane.get(fd);
  expect(f1).toBeInstanceOf(Foo);
  const f2 = membrane.get(fd);
  expect(f2).toBe(f1);
  expect(fn.callCount).toBe(1);
});
