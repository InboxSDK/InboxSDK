/* @flow */

import assert from 'assert';
import Marker from '../src/common/marker';
import delay from 'pdelay';

import HandlerRegistry from '../src/platform-implementation-js/lib/handler-registry';

describe('HandlerRegistry', function() {
  it('handler called on existing targets asynchronously', async function() {
    var target1 = Marker('target1');
    var target2 = Marker('target2');

    var reg = new HandlerRegistry();
    reg.addTarget(target1);
    reg.addTarget(target2);

    var needToSee = new Set([target1, target2]);
    reg.registerHandler(target => {
      assert(needToSee.delete(target));
    });
    assert.strictEqual(needToSee.size, 2);
    await delay(1);
    assert.strictEqual(needToSee.size, 0);
  });

  it('handler called on new targets', async function() {
    var target1 = Marker('target1');
    var target2 = Marker('target2');
    var target3 = Marker('target3');

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
        case 2:
          assert.strictEqual(target, target3);
          break;
        default:
          throw new Error("Should not happen");
      }
    });

    reg.addTarget(target2);
    assert.strictEqual(calls, 0);
    await delay(1);
    assert.strictEqual(calls, 2);
    reg.addTarget(target3);
    assert.strictEqual(calls, 3);
  });

  it('handler not called on removed targets', async function() {
    var target1 = Marker('target1');
    var target2 = Marker('target2');
    var target3 = Marker('target3');

    var reg = new HandlerRegistry();
    reg.addTarget(target1);
    reg.addTarget(target2);
    reg.addTarget(target3);

    reg.removeTarget(target1);

    var calls = 0;
    reg.registerHandler(function(target) {
      calls++;
      assert.strictEqual(target, target3);
    });
    reg.removeTarget(target2);

    assert.strictEqual(calls, 0);
    await delay(1);
    assert.strictEqual(calls, 1);
  });

  it('handler can unsubscribe', async function() {
    var target1 = Marker('target1');
    var target2 = Marker('target2');

    var reg = new HandlerRegistry();
    reg.addTarget(target1);

    var unsub = reg.registerHandler(function(target) {
      throw new Error('Should not happen');
    });
    unsub();
    reg.addTarget(target2);
    await delay(1);
  });

  it('dumpHandlers works', async function() {
    // Make sure it can handle dumping handlers that have fired already and
    // ones that haven't passed the initial asap delay.
    var i = 0;
    var target1 = Marker('target1');
    var target2 = Marker('target2');

    var reg = new HandlerRegistry();
    reg.addTarget(target1);

    reg.registerHandler(function(target) {
      if (i++ !== 0)
        throw new Error('Should not happen');
    });

    await delay(2);

    reg.registerHandler(function(target) {
      throw new Error('Should not happen');
    });
    reg.dumpHandlers();
    reg.addTarget(target2);
    await delay(1);
  });
});
