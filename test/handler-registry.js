var assert = require('assert');
var Marker = require('../src/common/marker');

var HandlerRegistry = require('../src/platform-implementation-js/lib/handler-registry');

describe('HandlerRegistry', function() {
  it('handler called on existing targets', function() {
    var target1 = Marker('target1');
    var target2 = Marker('target2');

    var reg = new HandlerRegistry();
    reg.addTarget(target1);
    reg.addTarget(target2);

    var needToSee = new Set([target1, target2]);
    reg.registerHandler(function(target) {
      assert(needToSee.delete(target));
    });

    assert.strictEqual(needToSee.size, 0);
  });

  it('handler called on new targets', function() {
    var target1 = Marker('target1');
    var target2 = Marker('target2');

    var reg = new HandlerRegistry();
    reg.addTarget(target1);

    var calls = 0;
    reg.registerHandler(function(target) {
      switch(calls++) {
        case 0:
          assert.strictEqual(target, target1);
          break;
        case 1:
          assert.strictEqual(target, target2);
          break;
        default:
          throw new Error("Should not happen");
      }
    });

    assert.strictEqual(1, calls);
    reg.addTarget(target2);
    assert.strictEqual(2, calls);
  });

  it('handler not called on removed targets', function() {
    var target1 = Marker('target1');
    var target2 = Marker('target2');

    var reg = new HandlerRegistry();
    reg.addTarget(target1);
    reg.addTarget(target2);

    reg.removeTarget(target1);

    var calls = 0;
    reg.registerHandler(function(target) {
      calls++;
      assert.strictEqual(target, target2);
    });

    assert.strictEqual(1, calls);
  });

  it('handler can unsubscribe', function() {
    var target1 = Marker('target1');

    var reg = new HandlerRegistry();

    var calls = 0;
    var unsub = reg.registerHandler(function(target) {
      throw new Error('Should not happen');
    });

    unsub();

    reg.addTarget(target1);
  });
});
