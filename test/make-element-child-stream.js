/* @flow */

import assert from 'assert';
import delay from 'pdelay';
import sinon from 'sinon';
const sinonTest = require('sinon-test')(sinon, {useFakeTimers: false});
import Kefir from 'kefir';
import events from 'events';
const {EventEmitter} = events;
import Marker from '../src/common/marker';
import MockElementParent from './lib/mock-element-parent';
import kefirBus from 'kefir-bus';
import fakePageGlobals from './lib/fake-page-globals';

import kefirMakeElementChildStream from '../src/platform-implementation-js/lib/dom/make-element-child-stream';

describe('kefirMakeElementChildStream', function() {
  fakePageGlobals();

  it('should work', function(done) {
    let child1 = Marker('child1'), child2 = Marker('child2'), child3 = Marker('child3');

    const target = new MockElementParent([child1, child2]);

    let call = 0;
    kefirMakeElementChildStream((target:Object)).onValue(event => {
      switch(++call) {
        case 1:
          assert.strictEqual(event.el, child1);
          event.removalStream.onValue(function() {
            target.appendChild(child3);
          });
          break;
        case 2:
          assert.strictEqual(event.el, child2);
          assert(event.removalStream instanceof Kefir.Observable);
          break;
        case 3:
          assert.strictEqual(event.el, child3);
          assert(event.removalStream instanceof Kefir.Observable);
          done();
          break;
        default:
          throw new Error("should not happen");
      }
    });

    setTimeout(function() {
      target.removeChild(child1);
    }, 0);
  });

  it('triggers removals when no longer listened on', function(done) {
    let child1 = Marker('child1'), child2 = Marker('child2');
    let stopper = kefirBus();

    const target = new MockElementParent([child1]);

    let call = 0;
    let child1Removed = 0, child2Removed = 0;
    let child1Ended = false, child2Ended = false;
    let stream = kefirMakeElementChildStream((target:Object)).takeUntilBy(stopper);
    stream.onValue(function(event) {
      switch(++call) {
        case 1:
          assert.strictEqual(event.el, child1);
          event.removalStream.onValue(function() {
            child1Removed++;
          });
          event.removalStream.onEnd(function() {
            child1Ended = true;
          });
          setTimeout(function() {
            target.appendChild(child2);
          }, 0);
          break;
        case 2:
          assert.strictEqual(event.el, child2);
          event.removalStream.onValue(function() {
            child2Removed++;
          });
          event.removalStream.onEnd(function() {
            child2Ended = true;
          });

          assert.strictEqual(child1Removed, 0);
          assert.strictEqual(child2Removed, 0);
          assert(!child1Ended);
          assert(!child2Ended);
          assert.strictEqual(child1Ended, false, 'sanity check');
          stopper.emit();
          assert.strictEqual(child1Ended, false, 'no sync removal check');
          break;
        default:
          throw new Error("should not happen");
      }
    });
    stream.onEnd(function() {
      setTimeout(function() {
        assert.strictEqual(child1Removed, 1);
        assert.strictEqual(child2Removed, 1);
        assert(child1Ended);
        assert(child2Ended);
        done();
      }, 0);
    });
  });

  it("doesn't miss children added during initial emits", function(done) {
    const child1 = Marker('child1'), child2 = Marker('child2');

    const target = new MockElementParent([child1]);

    let i = 0;
    const stream = kefirMakeElementChildStream((target:Object));
    stream.onValue(event => {
      switch(++i) {
        case 1:
          assert.strictEqual(event.el, child1);
          target.appendChild(child2);
          break;
        case 2:
          assert.strictEqual(event.el, child2);
          done();
          break;
        default:
          throw new Error("should not happen");
      }
    });
  });

  it("doesn't miss children if some are removed during initial emits", function(done) {
    const child1 = Marker('child1'), child2 = Marker('child2');

    const target = new MockElementParent([child1, child2]);

    let i = 0;
    const stream = kefirMakeElementChildStream((target:Object));
    stream.onValue(event => {
      switch(++i) {
        case 1:
          assert.strictEqual(event.el, child1);
          target.removeChild(child1);
          break;
        case 2:
          assert.strictEqual(event.el, child2);
          done();
          break;
        default:
          throw new Error("should not happen");
      }
    });
  });

  it.only("is exception-safe while emitting", sinonTest(async function() {
    let testErrorCatchCount = 0;
    const testError = new Error('child2 test error');
    {
      const _setTimeout = setTimeout;
      this.stub(global, 'setTimeout').callsFake((fn, delay, ...args) => {
        return _setTimeout(function() {
          try {
            return fn.apply(this, arguments);
          } catch (err) {
            if (err === testError) {
              testErrorCatchCount++;
            } else {
              throw err;
            }
          }
        }, delay, ...args);
      });
    }

    const child1 = Marker('child1'), child2 = Marker('child2'), child3 = Marker('child3');
    const child3RemovalSpy = sinon.spy();

    const target = new MockElementParent([child1, child2, child3]);

    let i = 0;
    const stream = kefirMakeElementChildStream((target:Object));
    stream.onValue(event => {
      switch(++i) {
        case 1:
          assert.strictEqual(event.el, child1);
          target.removeChild(child1);
          break;
        case 2:
          assert.strictEqual(event.el, child2);
          throw testError;
        case 3:
          assert.strictEqual(event.el, child3);
          event.removalStream.onValue(child3RemovalSpy);
          break;
        default:
          throw new Error("should not happen");
      }
    });

    await delay(20);

    assert.strictEqual(testErrorCatchCount, 1);
    assert.strictEqual(i, 3);
    assert(child3RemovalSpy.notCalled);

    target.removeChild(child3);

    await delay(20);

    assert(child3RemovalSpy.calledOnce);
  }));
});
