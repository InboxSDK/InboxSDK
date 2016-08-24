/* @flow */

import once from 'lodash/once';
import assert from 'assert';
import sinon from 'sinon';
import Kefir from 'kefir';
import jsdomDoc from './lib/jsdom-doc';
import fakePageGlobals from './lib/fake-page-globals';

import selectorStream from '../src/platform-implementation-js/lib/dom/selectorStream';

const page = once(() => jsdomDoc(`
<html>
<body>
  <div class="parent">
    <div role="main">
      <div>bar</div>
      <button class="foo">foo</button>
    </div>
    <div class="search">
      <div class="ignoreMe">
        <button>ignore me</button>
      </div>
      <div>
        <button class="foo">foo</button>
      </div>
    </div>
  </div>
</body>
</html>
`));

describe('selectorStream', function() {
  this.slow(5000);
  this.timeout(10000);

  fakePageGlobals();

  it('basic case works', function(cb) {
    const spy = sinon.spy();
    selectorStream(page().body, [
      '.parent',
      '[role=main]',
      'button'
    ])
      .takeUntilBy(Kefir.later(50))
      .onValue(spy)
      .onEnd(() => {
        const results = spy.args.map(callArgs => callArgs[0].el);
        assert.strictEqual(results.length, 1);
        assert(results.includes(page().querySelector('[role=main] button.foo')));
        cb();
      });
  });

  it('universal selector', function(cb) {
    const spy = sinon.spy();
    selectorStream(page().body, [
      '.parent',
      'div[role=main]',
      '*'
    ])
      .takeUntilBy(Kefir.later(50))
      .onValue(spy)
      .onEnd(() => {
        const results = spy.args.map(callArgs => callArgs[0].el);
        assert.strictEqual(results.length, 2);
        assert(results.includes(page().querySelector('[role=main] div')));
        assert(results.includes(page().querySelector('[role=main] button.foo')));
        cb();
      });
  });

  it(':not works', function(cb) {
    const spy = sinon.spy();
    selectorStream(page().body, [
      '.parent',
      'div.search',
      ':not(.ignoreMe)',
      'button'
    ])
      .takeUntilBy(Kefir.later(50))
      .onValue(spy)
      .onEnd(() => {
        const results = spy.args.map(callArgs => callArgs[0].el);
        assert.strictEqual(results.length, 1);
        assert(results.includes(page().querySelector('.search button.foo')));
        cb();
      });
  });

  xit('$or object works', function(cb) {
    const spy = sinon.spy();
    selectorStream(page().body, [
      '.parent',
      {$or: [
        [
          '[role=main]',
          'button'
        ],
        [
          '.search',
          'div:not(.ignoreMe)',
          'button'
        ]
      ]}
    ])
      .takeUntilBy(Kefir.later(50))
      .onValue(spy)
      .onEnd(() => {
        const results = spy.args.map(callArgs => callArgs[0].el);
        assert.strictEqual(results.length, 2);
        assert(results.includes(page().querySelector('[role=main] button.foo')));
        assert(results.includes(page().querySelector('.search button.foo')));
        cb();
      });
  });
});
