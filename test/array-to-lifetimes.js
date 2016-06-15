/* @flow */

import assert from 'assert';
import asap from 'asap';
import Kefir from 'kefir';
import sinon from 'sinon';

import arrayToLifetimes from '../src/platform-implementation-js/lib/array-to-lifetimes';

describe('arrayToLifetimes', function() {
  it('works', function(cb) {
    const events = [];
    arrayToLifetimes(
      Kefir.sequentially(0, [
        ['a', 'b'],
        ['b', 'd'],
        ['a', 'b', 'c']
      ])
    )
      .onValue(({el, removalStream}) => {
        events.push(['add', el]);
        removalStream.take(1).onValue(() => {
          events.push(['remove', el]);
        });
      })
      .onEnd(() => {
        asap(() => {
          assert.deepEqual(events, [
            ['add', 'a'],
            ['add', 'b'],
            ['remove', 'a'],
            ['add', 'd'],
            ['remove', 'd'],
            ['add', 'a'],
            ['add', 'c'],
            ['remove', 'b'],
            ['remove', 'a'],
            ['remove', 'c']
          ]);
          cb();
        });
      });
  });

  it('unsubscription triggers removal', function(cb) {
    this.slow();

    const events = [];
    arrayToLifetimes(
      Kefir.sequentially(50, [
        ['a', 'b'],
        ['a'],
        ['a', 'b', 'c']
      ])
    )
      .takeUntilBy(Kefir.later(120))
      .onValue(({el, removalStream}) => {
        events.push(['add', el]);
        removalStream.take(1).onValue(() => {
          events.push(['remove', el]);
        });
      })
      .onEnd(() => {
        asap(() => {
          assert.deepEqual(events, [
            ['add', 'a'],
            ['add', 'b'],
            ['remove', 'b'],
            ['remove', 'a']
          ]);
          cb();
        });
      });
  });

  it('works with properties', function(cb) {
    const events = [];
    arrayToLifetimes(
      Kefir.sequentially(0, [
        ['a', 'c']
      ]).toProperty(() => ['a', 'b'])
    )
      .onValue(({el, removalStream}) => {
        events.push(['add', el]);
        removalStream.take(1).onValue(() => {
          events.push(['remove', el]);
        });
      })
      .onEnd(() => {
        asap(() => {
          assert.deepEqual(events, [
            ['add', 'a'],
            ['add', 'b'],
            ['remove', 'b'],
            ['add', 'c'],
            ['remove', 'a'],
            ['remove', 'c']
          ]);
          cb();
        });
      });
  });

  it('passes errors', function(cb) {
    const events = [];
    arrayToLifetimes(
      Kefir.merge([
        Kefir.constantError('foo'),
        Kefir.sequentially(0, [
          ['a', 'b'],
          ['a']
        ])
      ])
    )
      .onAny(event => {
        if (event.type === 'value') {
          const {el, removalStream} = event.value;
          events.push(['add', el]);
          removalStream.take(1).onValue(() => {
            events.push(['remove', el]);
          });
        } else if (event.type === 'error') {
          events.push(['error', event.value]);
        }
      })
      .onEnd(() => {
        asap(() => {
          assert.deepEqual(events, [
            ['error', 'foo'],
            ['add', 'a'],
            ['add', 'b'],
            ['remove', 'b'],
            ['remove', 'a']
          ]);
          cb();
        });
      });
  });
});
