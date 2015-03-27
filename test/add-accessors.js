import assert from 'assert';
import sinon from 'sinon';

import addAccessors from '../src/platform-implementation-js/lib/add-accessors';

function landmine() {
  throw new Error("Should not be called");
}

describe('addAccessors', function() {
  it('get works', function() {
    class A {
      constructor(x) {
        this._x = x;
      }
    }
    addAccessors(A.prototype, [
      {name: '_x', get: true}
    ]);

    const a = new A(42);
    assert.strictEqual(a.getX(), 42);
    assert.strictEqual(a.setX, undefined);
  });

  it('set works', function() {
    class A {
      constructor(x) {
        this._x = x;
      }
    }
    addAccessors(A.prototype, [
      {name: '_x', set: true}
    ]);

    const a = new A(42);
    assert.strictEqual(a.getX, undefined);
    a.setX(19);
    assert.strictEqual(a._x, 19);
  });

  it('get and set works', function() {
    class A {
      constructor(x) {
        this._x = x;
      }
    }
    addAccessors(A.prototype, [
      {name: '_x', get: true, set: true}
    ]);

    const a = new A(42);
    assert.strictEqual(a.getX(), 42);
    a.setX(19);
    assert.strictEqual(a.getX(), 19);
  });

  it('destroy kills members', function() {
    class A {
      constructor(x) {
        this._x = x;
      }
    }
    addAccessors(A.prototype, [
      {name: '_x', get: true}
    ]);

    const obj = {destroy: landmine};
    const a = new A(obj);
    assert.strictEqual(a.getX(), obj);
    a.destroy();
    assert.strictEqual(a.getX(), undefined);
  });

  it('destroy method is called if destroy:true', function() {
    class A {
      constructor(x) {
        this._x = x;
      }
    }
    addAccessors(A.prototype, [
      {name: '_x', get: true, destroy: true}
    ]);

    const obj = {destroy: sinon.spy()};
    const a = new A(obj);
    assert.strictEqual(a.getX(), obj);
    assert(obj.destroy.notCalled);
    a.destroy();
    assert(obj.destroy.calledOnce);
    assert.strictEqual(a.getX(), undefined);
  });

  it('destroy method is called if destroy:true', function() {
    class A {
      constructor(x) {
        this._x = x;
      }
    }
    addAccessors(A.prototype, [
      {name: '_x', get: true, destroy: true}
    ]);

    const obj = {destroy: sinon.spy()};
    const a = new A(obj);
    assert.strictEqual(a.getX(), obj);
    assert(obj.destroy.notCalled);
    a.destroy();
    assert(obj.destroy.calledOnce);
    assert.strictEqual(a.getX(), undefined);
    a.destroy();
    assert(obj.destroy.calledOnce);
  });

  it('destroyMethod is used', function() {
    class A {
      constructor(x, y) {
        this._x = x;
        this._y = y;
      }
    }
    addAccessors(A.prototype, [
      {name: '_x', get: true, destroy: true, destroyMethod: 'foo'},
      {name: '_y', get: true, destroy: false, destroyMethod: 'foo'}
    ]);

    const objX = {foo: sinon.spy()};
    const objY = {foo: landmine};

    const a = new A(objX, objY);
    assert.strictEqual(a.getX(), objX);
    assert.strictEqual(a.getY(), objY);
    assert(objX.foo.notCalled);
    a.destroy();
    assert(objX.foo.calledOnce);
    assert.strictEqual(a.getX(), undefined);
    assert.strictEqual(a.getY(), undefined);
  });

  it('always adds destroy method', function() {
    const destroySpy = sinon.spy();
    class A {
    }
    addAccessors(A.prototype, []);
    assert(A.prototype.destroy);
    const a = new A();
    a.destroy();
  });


  it('destroy calls existing destroy method', function() {
    const destroy = sinon.spy();
    class A {}
    A.prototype.destroy = destroy;
    addAccessors(A.prototype, []);
    assert.notStrictEqual(A.prototype.destroy, destroy);
    const a = new A();
    a.destroy();
    assert(destroy.calledOnce);
  });

  it('destroy calls super.destroy', function() {
    class A {
      constructor(x) {
        this._x = x;
      }
    }
    addAccessors(A.prototype, [
      {name: '_x', get: true, destroy: true},
    ]);
    class B extends A {
      constructor(x, y) {
        super(x);
        this._y = y;
      }
    }
    addAccessors(B.prototype, [
      {name: '_y', get: true, destroy: false},
    ]);

    const objX = {destroy: sinon.spy()};
    const objY = {destroy: landmine};

    const b = new B(objX, objY);
    assert.strictEqual(b.getX(), objX);
    assert.strictEqual(b.getY(), objY);
    assert(objX.destroy.notCalled);
    b.destroy();
    assert(objX.destroy.calledOnce);
    assert.strictEqual(b.getX(), undefined);
    assert.strictEqual(b.getY(), undefined);
  });
});
