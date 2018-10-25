/* @flow */

import delay from 'pdelay';
import sinon from 'sinon';
const sinonTest = require('sinon-test')(sinon, {useFakeTimers: false});
import Kefir from 'kefir';
import events from 'events';
const {EventEmitter} = events;
import MockElementParent from '../../../../test/lib/mock-element-parent';
import MockMutationObserver from '../../../../test/lib/mock-mutation-observer';
import kefirBus from 'kefir-bus';

import kefirMakeElementChildStream from './make-element-child-stream';

global.MutationObserver = MockMutationObserver;

function fakeEl(name: string): Object {
  return {name, nodeType: 1};
}

it('should work', done => {
  let child1 = fakeEl('child1'), child2 = fakeEl('child2'), child3 = fakeEl('child3');

  const target = new MockElementParent([child1, child2]);

  let call = 0;
  kefirMakeElementChildStream((target:Object)).onValue(event => {
    switch(++call) {
      case 1:
        expect(event.el).toBe(child1);
        event.removalStream.onValue(() => {
          target.appendChild(child3);
        });
        break;
      case 2:
        expect(event.el).toBe(child2);
        expect(event.removalStream).toBeInstanceOf(Kefir.Observable);
        break;
      case 3:
        expect(event.el).toBe(child3);
        expect(event.removalStream).toBeInstanceOf(Kefir.Observable);
        done();
        break;
      default:
        throw new Error("should not happen");
    }
  });

  setTimeout(() => {
    target.removeChild(child1);
  }, 0);
});

it('triggers removals when no longer listened on', done => {
  const child1 = fakeEl('child1'), child2 = fakeEl('child2');
  const stopper = kefirBus();

  const target = new MockElementParent([child1]);

  let call = 0;
  let child1Removed = 0, child2Removed = 0;
  let child1Ended = false, child2Ended = false;
  const stream = kefirMakeElementChildStream((target:Object)).takeUntilBy(stopper);
  stream.onValue(event => {
    switch(++call) {
      case 1:
        expect(event.el).toBe(child1);
        event.removalStream.onValue(() => {
          child1Removed++;
        });
        event.removalStream.onEnd(() => {
          child1Ended = true;
        });
        setTimeout(() => {
          target.appendChild(child2);
        }, 0);
        break;
      case 2:
        expect(event.el).toBe(child2);
        event.removalStream.onValue(() => {
          child2Removed++;
        });
        event.removalStream.onEnd(() => {
          child2Ended = true;
        });

        expect(child1Removed).toBe(0);
        expect(child2Removed).toBe(0);
        expect(child1Ended).toBe(false);
        expect(child2Ended).toBe(false);
        stopper.emit();
        expect(child1Ended).toBe(false); // no sync removal check
        expect(child2Ended).toBe(false);
        break;
      default:
        throw new Error("should not happen");
    }
  });
  stream.onEnd(() => {
    setTimeout(() => {
      expect(child1Removed).toBe(1);
      expect(child2Removed).toBe(1);
      expect(child1Ended).toBe(true);
      expect(child2Ended).toBe(true);
      done();
    }, 0);
  });
});

it("doesn't miss children added during initial emits", done => {
  const child1 = fakeEl('child1'), child2 = fakeEl('child2');

  const target = new MockElementParent([child1]);

  let i = 0;
  const stream = kefirMakeElementChildStream((target:Object));
  stream.onValue(event => {
    switch(++i) {
      case 1:
        expect(event.el).toBe(child1);
        target.appendChild(child2);
        break;
      case 2:
        expect(event.el).toBe(child2);
        done();
        break;
      default:
        throw new Error("should not happen");
    }
  });
});

it("doesn't miss children if some are removed during initial emits", done => {
  const child1 = fakeEl('child1'), child2 = fakeEl('child2');

  const target = new MockElementParent([child1, child2]);

  let i = 0;
  const stream = kefirMakeElementChildStream((target:Object));
  stream.onValue(event => {
    switch(++i) {
      case 1:
        expect(event.el).toBe(child1);
        target.removeChild(child1);
        break;
      case 2:
        expect(event.el).toBe(child2);
        done();
        break;
      default:
        throw new Error("should not happen");
    }
  });
});

it("is exception-safe while emitting", sinonTest(async function() {
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

  const child1 = fakeEl('child1'), child2 = fakeEl('child2'), child3 = fakeEl('child3');
  const child3RemovalSpy = sinon.spy();

  const target = new MockElementParent([child1, child2, child3]);

  let i = 0;
  const stream = kefirMakeElementChildStream((target:Object));
  stream.onValue(event => {
    switch(++i) {
      case 1:
        expect(event.el).toBe(child1);
        target.removeChild(child1);
        break;
      case 2:
        expect(event.el).toBe(child2);
        throw testError;
      case 3:
        expect(event.el).toBe(child3);
        event.removalStream.onValue(child3RemovalSpy);
        break;
      default:
        throw new Error("should not happen");
    }
  });

  await delay(20);

  expect(testErrorCatchCount).toBe(1);
  expect(i).toBe(3);
  expect(child3RemovalSpy.callCount).toBe(0);

  target.removeChild(child3);

  await delay(20);

  expect(child3RemovalSpy.callCount).toBe(1);
}));
