/* @flow */

import once from 'lodash/once';
import assert from 'assert';
import sinon from 'sinon';
import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';
import delay from '../src/common/delay';
import jsdomDoc from './lib/jsdom-doc';
import fakePageGlobals from './lib/fake-page-globals';
import makeElementIntoEventEmitter from './lib/makeElementIntoEventEmitter';

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
    <div class="ignoreMe">
      <button>ignore me</button>
    </div>
  </div>
</body>
</html>
`));

describe('selectorStream', function() {
  this.slow(5000);
  this.timeout(10000);

  fakePageGlobals();

  const sandbox = sinon.sandbox.create();

  afterEach(function() {
    sandbox.restore();
  });

  it('basic case works', function(cb) {
    const onValueSpy = sinon.spy();
    selectorStream([
      '.parent',
      '[role=main]',
      'button'
    ])(page().body)
      .takeUntilBy(Kefir.later(50))
      .onValue(onValueSpy)
      .onEnd(() => {
        const results = onValueSpy.args.map(callArgs => callArgs[0].el);
        assert.strictEqual(results.length, 1);
        assert(results.includes(page().querySelector('[role=main] button.foo')));
        cb();
      });
  });

  it('attribute presence', function(cb) {
    const onValueSpy = sinon.spy();
    selectorStream([
      '.parent',
      '[role]',
      'button'
    ])(page().body)
      .takeUntilBy(Kefir.later(50))
      .onValue(onValueSpy)
      .onEnd(() => {
        const results = onValueSpy.args.map(callArgs => callArgs[0].el);
        assert.strictEqual(results.length, 1);
        assert(results.includes(page().querySelector('[role=main] button.foo')));
        cb();
      });
  });

  it('attribute comparisons', function(cb) {
    const onValueSpy = sinon.spy();
    selectorStream([
      '[class^="paren"]',
      '[role*="ai"]',
      'button[class$="oo"]'
    ])(page().body)
      .takeUntilBy(Kefir.later(50))
      .onValue(onValueSpy)
      .onEnd(() => {
        const results = onValueSpy.args.map(callArgs => callArgs[0].el);
        assert.strictEqual(results.length, 1);
        assert(results.includes(page().querySelector('[role=main] button.foo')));
        cb();
      });
  });

  it('universal selector', function(cb) {
    const onValueSpy = sinon.spy();
    selectorStream([
      '.parent',
      'div[role="main"]',
      '*'
    ])(page().body)
      .takeUntilBy(Kefir.later(50))
      .onValue(onValueSpy)
      .onEnd(() => {
        const results = onValueSpy.args.map(callArgs => callArgs[0].el);
        assert.strictEqual(results.length, 2);
        assert(results.includes(page().querySelector('[role=main] div')));
        assert(results.includes(page().querySelector('[role=main] button.foo')));
        cb();
      });
  });

  it(':not works', function(cb) {
    const onValueSpy = sinon.spy();
    selectorStream([
      '.parent',
      'div.search',
      ':not(.ignoreMe)',
      'button'
    ])(page().body)
      .takeUntilBy(Kefir.later(50))
      .onValue(onValueSpy)
      .onEnd(() => {
        const results = onValueSpy.args.map(callArgs => callArgs[0].el);
        assert.strictEqual(results.length, 1);
        assert(results.includes(page().querySelector('.search button.foo')));
        cb();
      });
  });

  it('comma works', function(cb) {
    const onValueSpy = sinon.spy();
    selectorStream([
      '.parent',
      'div[role="main"], .search',
      'div:not(.foo, .ignoreMe)'
    ])(page().body)
      .takeUntilBy(Kefir.later(50))
      .onValue(onValueSpy)
      .onEnd(() => {
        const results = onValueSpy.args.map(callArgs => callArgs[0].el);
        assert.strictEqual(results.length, 2);
        assert(results.includes(page().querySelector('[role=main] div')));
        assert(results.includes(page().querySelector('.search div:not(.ignoreMe)')));
        cb();
      });
  });

  it('$or object works', function(cb) {
    const onValueSpy = sinon.spy();
    selectorStream([
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
    ])(page().body)
      .takeUntilBy(Kefir.later(50))
      .onValue(onValueSpy)
      .onEnd(() => {
        const results = onValueSpy.args.map(callArgs => callArgs[0].el);
        assert.strictEqual(results.length, 2);
        assert(results.includes(page().querySelector('[role=main] button.foo')));
        assert(results.includes(page().querySelector('.search button.foo')));
        cb();
      });
  });

  it('$or object at end works', function(cb) {
    const onValueSpy = sinon.spy();
    selectorStream([
      '.parent',
      {$or: [
        [
          '[role=main]'
        ],
        [
          '.search',
          'div:not(.ignoreMe)'
        ]
      ]},
      'button'
    ])(page().body)
      .takeUntilBy(Kefir.later(50))
      .onValue(onValueSpy)
      .onEnd(() => {
        const results = onValueSpy.args.map(callArgs => callArgs[0].el);
        assert.strictEqual(results.length, 2);
        assert(results.includes(page().querySelector('[role=main] button.foo')));
        assert(results.includes(page().querySelector('.search button.foo')));
        cb();
      });
  });

  it('reports error in merge in :not() when set up', function() {
    assert.throws(() => {
      selectorStream([
        '.parent',
        {$or: [
          [
            '[role=main]'
          ],
          [
            '.search',
            'div:not(.ignoreMe:invalid)'
          ]
        ]},
        'button'
      ]);
    }, /:invalid/);
  });

  it('handles element removal', function(cb) {
    const onValueSpy = sinon.spy();
    const removalSpy = sinon.spy();
    const body = page().querySelector('body');
    const bodyMutation = makeElementIntoEventEmitter(body);
    selectorStream([
      '.parent',
      {$or: [
        [
          '[role=main]',
        ]
      ]},
      'button',
      {$watch: '[class]'}
    ])(page().body)
      .takeUntilBy(Kefir.later(50))
      .onValue(({el,removalStream}) => {
        removalStream.onValue(removalSpy);
        assert(removalSpy.notCalled);
        bodyMutation({
          addedNodes: [],
          removedNodes: body.children
        });
      })
      .onValue(onValueSpy)
      .onEnd(() => {
        const results = onValueSpy.args.map(callArgs => callArgs[0].el);
        assert.strictEqual(results.length, 1);
        assert(results.includes(page().querySelector('[role=main] button.foo')));
        assert(removalSpy.calledOnce);
        cb();
      });
  });

  it('$watch works', function(cb) {
    const onValueSpy = sinon.spy();
    const removalSpy = sinon.spy();
    const stopper = kefirStopper();
    const main = page().querySelector('[role=main]');
    const mainMutation = makeElementIntoEventEmitter(main);
    selectorStream([
      '.parent',
      '[role=main]',
      {$watch: '[data-foo]'},
      'button'
    ])(page().body)
      .takeUntilBy(stopper)
      .onValue(({el,removalStream}) => {
        removalStream.onValue(removalSpy);
        assert(removalSpy.notCalled);
      })
      .onValue(onValueSpy)
      .onEnd(() => {
        const results = onValueSpy.args.map(callArgs => callArgs[0].el);
        assert.strictEqual(results.length, 1);
        assert(results.includes(page().querySelector('[role=main] button.foo')));
        assert(removalSpy.calledOnce);
        cb();
      });

    (async () => {
      await delay(20);

      assert(onValueSpy.notCalled);
      assert(removalSpy.notCalled);
      main.setAttribute('data-foo', 'true');
      mainMutation({
        attributeName: 'data-foo'
      });

      await delay(20);

      assert(onValueSpy.calledOnce);
      assert(removalSpy.notCalled);
      main.removeAttribute('data-foo');
      mainMutation({
        attributeName: 'data-foo'
      });

      await delay(20);

      stopper.destroy();
    })().catch(cb);
  });

  it('$log works', function(cb) {
    const onValueSpy = sinon.spy();
    sandbox.stub(console, 'log');
    selectorStream([
      '.parent',
      {$log: 'parent'},
      'div:not(.ignoreMe)',
      {$log: 'div'},
      'button.foo',
      {$log: 'button'}
    ])(page().body)
      .takeUntilBy(Kefir.later(50))
      .onValue(onValueSpy)
      .onEnd(() => {
        const results = onValueSpy.args.map(callArgs => callArgs[0].el);
        assert.strictEqual(results.length, 1);
        assert(results.includes(page().querySelector('[role=main] button.foo')));

        assert.deepStrictEqual(console.log.args, [
          ['parent', page().querySelector('.parent')],
          ['div', page().querySelector('.parent > [role=main]')],
          ['div', page().querySelector('.parent > .search')],
          ['button', page().querySelector('[role=main] > button.foo')]
        ]);

        cb();
      });
  });

  it('$filter works', function(cb) {
    const onValueSpy = sinon.spy();
    selectorStream([
      '.parent',
      '*',
      {$filter: el => el.getAttribute('role') === 'main'},
      'button'
    ])(page().body)
      .takeUntilBy(Kefir.later(50))
      .onValue(onValueSpy)
      .onEnd(() => {
        const results = onValueSpy.args.map(callArgs => callArgs[0].el);
        assert.strictEqual(results.length, 1);
        assert(results.includes(page().querySelector('[role=main] button.foo')));
        cb();
      });
  });

  it('$map works', function(cb) {
    const onValueSpy = sinon.spy();
    selectorStream([
      '.parent',
      '*',
      {$map: el =>
        el.getAttribute('role') === 'main' ?
          el.querySelector('button') : null
      }
    ])(page().body)
      .takeUntilBy(Kefir.later(50))
      .onValue(onValueSpy)
      .onEnd(() => {
        const results = onValueSpy.args.map(callArgs => callArgs[0].el);
        assert.strictEqual(results.length, 1);
        assert(results.includes(page().querySelector('[role=main] button.foo')));
        cb();
      });
  });
});
