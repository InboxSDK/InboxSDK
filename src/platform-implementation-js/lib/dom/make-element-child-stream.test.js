/* @flow */

import _ from 'lodash';
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
  const childrenToNames = new Map(_.toPairs({
    child1, child2, child3
  }).map(([name, el]) => [el, name]));

  const target = new MockElementParent([child1, child2]);

  const calls = [];
  kefirMakeElementChildStream((target:Object)).onValue(event => {
    const name = childrenToNames.get(event.el);
    calls.push(['add', name]);
    event.removalStream.onValue(() => {
      calls.push(['remove', name]);

      if (event.el === child1) {
        target.appendChild(child3);
      }
    });

    if (event.el === child2) {
      target.removeChild(child1);
    }

    if (calls.length >= 4) {
      expect(calls).toEqual([
        ['add', 'child1'],
        ['add', 'child2'],
        ['remove', 'child1'],
        ['add', 'child3']
      ]);
      done();
    }
  });
});

it('triggers removals when no longer listened on', done => {
  const child1 = fakeEl('child1'), child2 = fakeEl('child2');
  const childrenToNames = new Map(_.toPairs({
    child1, child2
  }).map(([name, el]) => [el, name]));

  const stopper = kefirBus();

  const target = new MockElementParent([child1]);

  const calls = [];
  const stream = kefirMakeElementChildStream((target:Object)).takeUntilBy(stopper);
  stream.onValue(event => {
    const name = childrenToNames.get(event.el);
    calls.push(['add', name]);
    event.removalStream.onValue(() => {
      calls.push(['remove', name]);

      if (calls.length >= 5) {
        expect(calls).toEqual([
          ['add', 'child1'],
          ['add', 'child2'],
          ['stopper'],
          ['remove', 'child1'],
          ['remove', 'child2']
        ]);
        done();
      }
    });

    if (event.el === child1) {
      target.appendChild(child2);
    } else if (event.el === child2) {
      calls.push(['stopper']);
      stopper.emit();
    }
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
  const childrenToNames = new Map(_.toPairs({
    child1, child2, child3
  }).map(([name, el]) => [el, name]));

  const target = new MockElementParent([child1, child2, child3]);

  const calls = [];
  const stream = kefirMakeElementChildStream((target:Object));

  await new Promise(resolve => {
    stream.onValue(event => {
      const name = childrenToNames.get(event.el);
      calls.push(['add', name]);
      event.removalStream.onValue(() => {
        calls.push(['remove', name]);

        if (event.el === child3) {
          resolve();
        }
      });

      if (event.el === child1) {
        target.removeChild(child1);
      } else if (event.el === child2) {
        setTimeout(() => {
          target.removeChild(child3);
        }, 0);
        throw testError;
      }
    });
  });

  expect(testErrorCatchCount).toBe(1);
  expect(calls).toEqual([
    ['add', 'child1'],
    ['add', 'child2'],
    ['add', 'child3'],
    ['remove', 'child1'],
    ['remove', 'child3'],
  ]);
}));
