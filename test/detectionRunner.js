/* @flow */

import assert from 'assert';
import asap from 'asap';
import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';
import once from 'lodash/function/once';
import jsdomDoc from './lib/jsdom-doc';

import detectionRunner from '../src/platform-implementation-js/lib/dom/detectionRunner';

const doc = once(() => jsdomDoc(''));

describe('detectionRunner', function() {
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
      root: doc()
    })
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
});
