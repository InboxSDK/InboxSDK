import assert from 'assert';
import sinon from 'sinon';

import BasicClass from '../src/platform-implementation-js/lib/basic-class';

describe('BasicClass', function() {
  it('can be inherited from', function(done) {
    class Test extends BasicClass {
      foo(cb) {
        cb();
      }
    }
    Test.prototype.__memberVariables = [];

    const test = new Test();
    test.foo(done);
  });

  describe('destroy', function() {
    it('destroyable member works', function() {
      class Test extends BasicClass {}
      Test.prototype.__memberVariables = [
        {name: '_a', destroy: true}
      ];

      const test = new Test();
      const a = test._a = {destroy: sinon.spy()};
      test.destroy();
      assert(a.destroy.calledOnce);
      assert.strictEqual(test._a, null);
    });

    it('members are only destroyed once', function() {
      class Test extends BasicClass {}
      Test.prototype.__memberVariables = [
        {name: '_a', destroy: true}
      ];

      const test = new Test();
      const a = test._a = {destroy: sinon.spy()};
      test.destroy();
      test.destroy();
      assert(a.destroy.calledOnce);
      assert.strictEqual(test._a, null);
    });

    it('remove method is used if there is no destroy', function() {
      class Test extends BasicClass {}
      Test.prototype.__memberVariables = [
        {name: '_a', destroy: true}
      ];

      const test = new Test();
      const a = test._a = {remove: sinon.spy()};
      test.destroy();
      assert(a.remove.calledOnce);
      assert.strictEqual(test._a, null);
    });

    it('destroy method is prioritized over remove', function() {
      class Test extends BasicClass {}
      Test.prototype.__memberVariables = [
        {name: '_a', destroy: true}
      ];

      const test = new Test();
      const a = test._a = {destroy: sinon.spy(), remove: sinon.spy()};
      test.destroy();
      assert(a.destroy.calledOnce);
      assert(a.remove.notCalled);
      assert.strictEqual(test._a, null);
    });

    it('destroyFunction works', function() {
      class Test extends BasicClass {}
      Test.prototype.__memberVariables = [
        {name: '_a', destroy: true, destroyFunction: 'beep'}
      ];

      const test = new Test();
      const a = test._a = {destroy: sinon.spy(), remove: sinon.spy(), beep: sinon.spy()};
      test.destroy();
      test.destroy();
      assert(a.destroy.notCalled);
      assert(a.remove.notCalled);
      assert(a.beep.calledOnce);
      assert.strictEqual(test._a, null);
    });

    it('destroy is not called on destroy:false methods', function() {
      class Test extends BasicClass {}
      Test.prototype.__memberVariables = [
        {name: '_a', destroy: true},
        {name: '_b', destroy: false, destroyFunction: 'beep'}
      ];

      const test = new Test();
      const a = test._a = {destroy: sinon.spy(), remove: sinon.spy(), beep: sinon.spy()};
      const b = test._b = {destroy: sinon.spy(), remove: sinon.spy(), beep: sinon.spy()};
      test.destroy();
      test.destroy();
      assert(a.destroy.calledOnce);
      assert(a.remove.notCalled);
      assert(a.beep.notCalled);
      assert(b.destroy.notCalled);
      assert(b.remove.notCalled);
      assert(b.beep.notCalled);
      assert.strictEqual(test._a, null);
      assert.strictEqual(test._b, null);
    });

    it('works with inheritance', function() {
      class TestParent extends BasicClass {}
      TestParent.prototype.__memberVariables = [
        {name: '_pa', destroy: true, destroyFunction: 'beep'},
        {name: '_pb', destroy: false}
      ];

      class TestChild extends TestParent {}
      TestChild.prototype.__memberVariables = [
        {name: '_ca', destroy: true, destroyFunction: 'beep'},
        {name: '_cb', destroy: false}
      ];

      const test = new TestChild();
      const pa = test._pa = {destroy: sinon.spy(), remove: sinon.spy(), beep: sinon.spy()};
      const pb = test._pb = {destroy: sinon.spy(), remove: sinon.spy(), beep: sinon.spy()};
      const ca = test._ca = {destroy: sinon.spy(), remove: sinon.spy(), beep: sinon.spy()};
      const cb = test._cb = {destroy: sinon.spy(), remove: sinon.spy(), beep: sinon.spy()};

      test.destroy();
      test.destroy();

      assert(pa.destroy.notCalled);
      assert(pa.remove.notCalled);
      assert(pa.beep.calledOnce);
      assert(pb.destroy.notCalled);
      assert(pb.remove.notCalled);
      assert(pb.beep.notCalled);
      assert.strictEqual(test._pa, null);
      assert.strictEqual(test._pb, null);

      assert(ca.destroy.notCalled);
      assert(ca.remove.notCalled);
      assert(ca.beep.calledOnce);
      assert(cb.destroy.notCalled);
      assert(cb.remove.notCalled);
      assert(cb.beep.notCalled);
      assert.strictEqual(test._ca, null);
      assert.strictEqual(test._cb, null);
    });
  });

  describe('getters and setters', function() {
    it('getters and setters work', function() {
      class Test extends BasicClass {}
      Test.prototype.__memberVariables = [
        {name: '_a', destroy: false},
        {name: '_b', destroy: false, get: true},
        {name: '_c', destroy: false, set: true},
        {name: '_d', destroy: false, get: true, set: true}
      ];

      const test = new Test();
      assert.strictEqual(test.getA, undefined);
      assert.strictEqual(test.setA, undefined);

      test._b = 5;
      assert.strictEqual(test.getB(), 5);
      test._b++;
      assert.strictEqual(test.getB(), 6);
      assert.strictEqual(test.setB, undefined);

      assert.strictEqual(test.getC, undefined);
      test.setC(100);
      assert.strictEqual(test._c, 100);
      test.setC(101);
      assert.strictEqual(test._c, 101);

      test.setD(200);
      assert.strictEqual(test.getD(), 200);
      test.setD(test.getD()+1);
      assert.strictEqual(test.getD(), 201);
    });

    it('works with inheritance', function() {
      class TestParent extends BasicClass {
        getC() {
          return 300;
        }
      }
      TestParent.prototype.__memberVariables = [
        {name: '_pa', destroy: false, set: true},
        {name: '_pb', destroy: false, get: true},
        {name: '_c', destroy: false, get: false},
        {name: '_d', destroy: false, get: true}
      ];

      class TestChild extends TestParent {
        getD() {
          return 4000;
        }
      }
      TestChild.prototype.__memberVariables = [
        {name: '_ca', destroy: false, set: true},
        {name: '_cb', destroy: false, get: true},
        {name: '_c', destroy: false, get: true},
        {name: '_d', destroy: false, get: false}
      ];

      class TestChildChild extends TestChild {}
      TestChildChild.prototype.__memberVariables = [];

      for (let TestClass of [TestChild, TestChildChild]) {
        //console.log('round', TestClass.name);
        const test = new TestClass();

        assert.strictEqual(test.getPa, undefined);
        assert.strictEqual(test.getCa, undefined);
        test.setPa(100);
        test.setCa(1000);
        assert.strictEqual(test._pa, 100);
        assert.strictEqual(test._ca, 1000);

        assert.strictEqual(test.setPb, undefined);
        assert.strictEqual(test.setCb, undefined);
        test._pb = 200;
        test._cb = 2000;
        assert.strictEqual(test.getPb(), 200);
        assert.strictEqual(test.getCb(), 2000);

        test._c = 3000;
        assert.strictEqual(test.getC(), 3000);

        test._d = 400;
        assert.strictEqual(test.getD(), 4000);
      }
    });
  });
});
