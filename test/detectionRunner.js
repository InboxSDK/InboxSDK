/* @flow */

import assert from 'assert';
import asap from 'asap';
import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';
import kefirBus from 'kefir-bus';
import once from 'lodash/function/once';
import jsdomDoc from './lib/jsdom-doc';

import detectionRunner from '../src/platform-implementation-js/lib/dom/detectionRunner';

const doc = once(() => jsdomDoc(''));

describe('detectionRunner', function() {
  this.slow(150);

  before(function() {
    doc();
  });

  it('basic test', function(cb) {
    const events = [];
    const e1 = {el: doc().createElement('div'), removalStream: Kefir.constant()};

    detectionRunner({
      name: 'test',
      parser: () => ({
        elements: {}, score: 1, errors: [], __extra: 123
      }),
      watcher: () => Kefir.later(5, e1),
      finder: () => [],
      root: doc(),
      logError(e) { events.push(['error', e.message]); }
    })
      .takeUntilBy(Kefir.later(50))
      .onValue(({el, removalStream, parsed}) => {
        assert.strictEqual(parsed.score, 1);
        assert.strictEqual(parsed.__extra, 123);
        events.push(['add', el]);
        removalStream.take(1).onValue(() => {
          events.push(['remove', el]);
        });
      })
      .onEnd(() => {
        asap(() => {
          assert.deepEqual(events, [
            ['add', e1.el],
            ['remove', e1.el]
          ]);
          cb();
        });
      });
  });

  it('finder and watcher together', function(cb) {
    const events = [];
    const e1 = {el: doc().createElement('div'), removalStream: kefirStopper()};

    detectionRunner({
      name: 'test',
      parser: () => ({
        elements: {}, score: 1, errors: [], __extra: 123
      }),
      watcher: () => Kefir.later(5, e1),
      finder: () => [e1.el],
      interval: 15,
      root: doc(),
      logError(e) { events.push(['error', e.message]); }
    })
      .takeUntilBy(Kefir.later(50))
      .onValue(({el, removalStream, parsed}) => {
        assert.strictEqual(parsed.score, 1);
        assert.strictEqual(parsed.__extra, 123);
        events.push(['add', el]);
        removalStream.take(1).onValue(() => {
          events.push(['remove', el]);
        });
      })
      .onEnd(() => {
        e1.removalStream.destroy();

        asap(() => {
          assert.deepEqual(events, [
            ['add', e1.el],
            ['remove', e1.el]
          ]);
          cb();
        });
      });
  });

  it('logs when finder finds something watcher missed', function(cb) {
    const events = [];
    const el1 = doc().createElement('div');

    detectionRunner({
      name: 'test',
      parser: () => ({elements: {}, score: 1, errors: []}),
      watcher: () => Kefir.never(),
      finder: () => [el1],
      root: doc(),
      interval: 5,
      logError(e) { events.push(['error', e.message]); }
    })
      .takeUntilBy(Kefir.later(50))
      .onValue(({el, removalStream, parsed}) => {
        events.push(['add', el]);
        removalStream.take(1).onValue(() => {
          events.push(['remove', el]);
        });
      })
      .onEnd(() => {
        asap(() => {
          assert.deepEqual(events, [
            ['error', 'detectionRunner(test) finder found element missed by watcher'],
            ['add', el1],
            ['remove', el1]
          ]);
          cb();
        });
      });
  });

  it('logs when watcher finds something finder misses', function(cb) {
    const events = [];
    const e1 = {el: doc().createElement('div'), removalStream: kefirStopper()};

    detectionRunner({
      name: 'test',
      parser: () => ({elements: {}, score: 1, errors: []}),
      watcher: () => Kefir.constant(e1),
      finder: () => [],
      root: doc(),
      interval: 2,
      logError(e) { events.push(['error', e.message]); }
    })
      .takeUntilBy(Kefir.later(20))
      .onValue(({el, removalStream, parsed}) => {
        events.push(['add', el]);
        removalStream.take(1).onValue(() => {
          events.push(['remove', el]);
        });
      })
      .onEnd(() => {
        e1.removalStream.destroy();

        asap(() => {
          assert.deepEqual(events, [
            ['add', e1.el],
            ['error', 'detectionRunner(test) finder missed element found by watcher'],
            ['remove', e1.el]
          ]);
          cb();
        });
      });
  });

  it('logs when watcher finds something after finder found it', function(cb) {
    const events = [];
    const e1 = {el: doc().createElement('div'), removalStream: Kefir.never()};

    detectionRunner({
      name: 'test',
      parser: () => ({elements: {}, score: 1, errors: []}),
      watcher: () => Kefir.later(20, e1),
      finder: () => [e1.el],
      root: doc(),
      interval: 5,
      logError(e) { events.push(['error', e.message]); }
    })
      .takeUntilBy(Kefir.later(50))
      .onValue(({el, removalStream, parsed}) => {
        events.push(['add', el]);
        removalStream.take(1).onValue(() => {
          events.push(['remove', el]);
        });
      })
      .onEnd(() => {
        asap(() => {
          assert.deepEqual(events, [
            ['error', 'detectionRunner(test) finder found element missed by watcher'],
            ['add', e1.el],
            ['error', 'detectionRunner(test) watcher emitted element previously found by finder'],
            ['remove', e1.el]
          ]);
          cb();
        });
      });
  });

  it("doesn't log when watcher and finder see element re-appear", function(cb) {
    const events = [];
    const e1 = {el: doc().createElement('div'), removalStream: kefirBus()};
    let finderElements = [e1.el];

    detectionRunner({
      name: 'test',
      parser: () => ({elements: {}, score: 1, errors: []}),
      watcher: () => Kefir.merge([
        Kefir.later(1, e1),
        Kefir.later(20).flatMap(() => {
          e1.removalStream.emit();
          finderElements = [];
          return Kefir.later(20).flatMap(() => {
            finderElements = [e1.el];
            return Kefir.constant(e1);
          });
        })
      ]),
      finder: () => finderElements,
      root: doc(),
      interval: 5,
      logError(e) { events.push(['error', e.message]); }
    })
      .takeUntilBy(Kefir.later(50))
      .onValue(({el, removalStream, parsed}) => {
        events.push(['add', el]);
        removalStream.take(1).onValue(() => {
          events.push(['remove', el]);
        });
      })
      .onEnd(() => {
        asap(() => {
          assert.deepEqual(events, [
            ['add', e1.el],
            ['remove', e1.el],
            ['add', e1.el]
          ]);
          cb();
        });
      });
  });

  it("doesn't log when watcher sees element re-appear quickly", function(cb) {
    const events = [];
    const e1 = {el: doc().createElement('div'), removalStream: kefirBus()};

    detectionRunner({
      name: 'test',
      parser: () => ({elements: {}, score: 1, errors: []}),
      watcher: () => Kefir.merge([
        Kefir.later(1, e1),
        Kefir.later(20).flatMap(() => {
          e1.removalStream.emit();
          return Kefir.constant(e1);
        })
      ]),
      finder: () => [e1.el],
      root: doc(),
      interval: 5,
      logError(e) { events.push(['error', e.message]); }
    })
      .takeUntilBy(Kefir.later(50))
      .onValue(({el, removalStream, parsed}) => {
        events.push(['add', el]);
        removalStream.take(1).onValue(() => {
          events.push(['remove', el]);
        });
      })
      .onEnd(() => {
        asap(() => {
          assert.deepEqual(events, [
            ['add', e1.el],
            ['remove', e1.el],
            ['add', e1.el]
          ]);
          cb();
        });
      });
  });

  it("logs when watcher emits an element twice", function(cb) {
    const events = [];
    const e1 = {el: doc().createElement('div'), removalStream: Kefir.never()};

    detectionRunner({
      name: 'test',
      parser: () => ({elements: {}, score: 1, errors: []}),
      watcher: () => Kefir.sequentially(10, [e1, e1]),
      finder: () => [e1.el],
      root: doc(),
      interval: 20,
      logError(e) { events.push(['error', e.message]); }
    })
      .takeUntilBy(Kefir.later(50))
      .onValue(({el, removalStream, parsed}) => {
        events.push(['add', el]);
        removalStream.take(1).onValue(() => {
          events.push(['remove', el]);
        });
      })
      .onEnd(() => {
        asap(() => {
          assert.deepEqual(events, [
            ['add', e1.el],
            ['error', 'detectionRunner(test) watcher emitted element previously emitted by watcher']
          ]);
          cb();
        });
      });
  });

  it("finder can rediscover elements that watcher said were removed", function(cb) {
    const events = [];
    const e1 = {el: doc().createElement('div'), removalStream: kefirBus()};

    detectionRunner({
      name: 'test',
      parser: () => ({elements: {}, score: 1, errors: []}),
      watcher: () => Kefir.merge([
        Kefir.later(1, e1),
        Kefir.later(20).flatMap(() => {
          e1.removalStream.emit();
          return Kefir.never();
        })
      ]),
      finder: () => [e1.el],
      root: doc(),
      interval: 5,
      logError(e) { events.push(['error', e.message]); }
    })
      .takeUntilBy(Kefir.later(50))
      .onValue(({el, removalStream, parsed}) => {
        events.push(['add', el]);
        removalStream.take(1).onValue(() => {
          events.push(['remove', el]);
        });
      })
      .onEnd(() => {
        asap(() => {
          assert.deepEqual(events, [
            ['add', e1.el],
            ['remove', e1.el],
            ['error', 'detectionRunner(test) finder found element missed by watcher'],
            ['add', e1.el],
            ['remove', e1.el]
          ]);
          cb();
        });
      });
  });
});
