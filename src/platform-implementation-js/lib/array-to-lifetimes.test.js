/* @flow */

import asap from 'asap';
import Kefir from 'kefir';
import sinon from 'sinon';

import arrayToLifetimes from './array-to-lifetimes';

it('works', cb => {
  const events = [];
  arrayToLifetimes(
    Kefir.sequentially(0, [['a', 'b'], ['b', 'd'], ['a', 'b', 'c']])
  )
    .onValue(({ el, removalStream }) => {
      events.push(['add', el]);
      removalStream.take(1).onValue(() => {
        events.push(['remove', el]);
      });
    })
    .onEnd(() => {
      asap(() => {
        expect(events).toEqual([
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

it('keyFn works', cb => {
  const events = [];
  arrayToLifetimes(
    Kefir.sequentially(0, [
      [{ v: 'a', k: 1 }, { v: 'b', k: 2 }],
      [{ v: 'B', k: 2 }, { v: 'd', k: 4 }],
      [{ v: 'A', k: 1 }, { v: 'b', k: 2 }, { v: 'c', k: 3 }]
    ]),
    el => el.k
  )
    .onValue(({ el, removalStream }) => {
      events.push(['add', el]);
      removalStream.take(1).onValue(() => {
        events.push(['remove', el]);
      });
    })
    .onEnd(() => {
      asap(() => {
        expect(events).toEqual([
          ['add', { v: 'a', k: 1 }],
          ['add', { v: 'b', k: 2 }],
          ['remove', { v: 'a', k: 1 }],
          ['add', { v: 'd', k: 4 }],
          ['remove', { v: 'd', k: 4 }],
          ['add', { v: 'A', k: 1 }],
          ['add', { v: 'c', k: 3 }],
          ['remove', { v: 'b', k: 2 }],
          ['remove', { v: 'A', k: 1 }],
          ['remove', { v: 'c', k: 3 }]
        ]);
        cb();
      });
    });
});

it('unsubscription triggers removal', cb => {
  const events = [];
  arrayToLifetimes(Kefir.sequentially(50, [['a', 'b'], ['a'], ['a', 'b', 'c']]))
    .takeUntilBy(Kefir.later(120))
    .onValue(({ el, removalStream }) => {
      events.push(['add', el]);
      removalStream.take(1).onValue(() => {
        events.push(['remove', el]);
      });
    })
    .onEnd(() => {
      asap(() => {
        expect(events).toEqual([
          ['add', 'a'],
          ['add', 'b'],
          ['remove', 'b'],
          ['remove', 'a']
        ]);
        cb();
      });
    });
});

it('works with properties', cb => {
  const events = [];
  arrayToLifetimes(
    Kefir.sequentially(0, [['a', 'c']]).toProperty(() => ['a', 'b'])
  )
    .onValue(({ el, removalStream }) => {
      events.push(['add', el]);
      removalStream.take(1).onValue(() => {
        events.push(['remove', el]);
      });
    })
    .onEnd(() => {
      asap(() => {
        expect(events).toEqual([
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

it('passes errors', cb => {
  const events = [];
  arrayToLifetimes(
    Kefir.merge([
      Kefir.constantError('foo'),
      Kefir.sequentially(0, [['a', 'b'], ['a']])
    ])
  )
    .onAny(event => {
      if (event.type === 'value') {
        const { el, removalStream } = event.value;
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
        expect(events).toEqual([
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
