/* @flow */

import _ from 'lodash';
import fs from 'fs';
import assert from 'assert';
import sinon from 'sinon';
import Kefir from 'kefir';
import jsdomDoc from './lib/jsdom-doc';
import fakePageGlobals from './lib/fake-page-globals';

import finder from '../src/platform-implementation-js/dom-driver/inbox/detection/compose/finder';
import parser from '../src/platform-implementation-js/dom-driver/inbox/detection/compose/parser';
import watcher from '../src/platform-implementation-js/dom-driver/inbox/detection/compose/watcher';

import {
  page20160614,
  pageWithSidebar20160614,
  pageFullscreen20160620,
  page20160628,
  page20160628_2,
  page20160629,
  page20160629_2,
  page20160629_3
} from './lib/pages';

describe('Inbox Compose Detection', function() {
  this.slow(5000);
  this.timeout(10000);

  fakePageGlobals();

  describe('finder', function() {
    it('2016-06-14', function() {
      const compose1 = page20160614().querySelector('[data-test-id=compose1]');
      const compose2 = page20160614().querySelector('[data-test-id=compose2]');
      const inlineCompose = page20160614().querySelector('[data-test-id=inlinecompose]');

      const results = finder(page20160614());
      assert.strictEqual(results.length, 3);
      assert(_.includes(results, compose1));
      assert(_.includes(results, compose2));
      assert(_.includes(results, inlineCompose));
    });

    it('2016-06-14 with chat sidebar', function() {
      const compose1 = pageWithSidebar20160614().querySelector('[data-test-id=compose1]');

      const results = finder(pageWithSidebar20160614());
      assert.strictEqual(results.length, 1);
      assert(_.includes(results, compose1));
    });

    it('2016-06-20 fullscreen and bundled inline', function() {
      const bundledInlineCompose = pageFullscreen20160620().querySelector('[data-test-id=bundledInlineCompose]');
      const fullscreenCompose = pageFullscreen20160620().querySelector('[data-test-id=fullscreenCompose]');

      const results = finder(pageFullscreen20160620());
      assert.strictEqual(results.length, 2);
      assert(_.includes(results, bundledInlineCompose));
      assert(_.includes(results, fullscreenCompose));
    });

    it('2016-06-28', function() {
      const compose = page20160628().querySelector('[data-test-id=compose]');

      const results = finder(page20160628());
      assert.strictEqual(results.length, 1);
      assert(_.includes(results, compose));
    });

    it('2016-06-28-2', function() {
      const compose = page20160628_2().querySelector('[data-test-id=compose]');

      const results = finder(page20160628_2());
      assert.strictEqual(results.length, 1);
      assert(_.includes(results, compose));
    });
  });

  describe('parser', function() {
    it('2016-06-14', function() {
      const compose = page20160614().querySelector('[data-test-id=compose1]');
      const results = parser(compose);
      assert.deepEqual(results.errors, []);
      assert.strictEqual(results.score, 1);
      assert(!results.attributes.isInline);
    });

    it('2016-06-14 inline', function() {
      const compose = page20160614().querySelector('[data-test-id=inlinecompose]');
      const results = parser(compose);
      assert.deepEqual(results.errors, []);
      assert.strictEqual(results.score, 1);
      assert(results.attributes.isInline);
    });

    it('2016-06-20 fullscreen', function() {
      const fullscreenCompose = pageFullscreen20160620().querySelector('[data-test-id=fullscreenCompose]');
      const results = parser(fullscreenCompose);
      assert.deepEqual(results.errors, []);
      assert.strictEqual(results.score, 1);
      assert(!results.attributes.isInline);
    });

    it('2016-06-20 bundled inline', function() {
      const bundledInlineCompose = pageFullscreen20160620().querySelector('[data-test-id=bundledInlineCompose]');
      const results = parser(bundledInlineCompose);
      assert.deepEqual(results.errors, []);
      assert.strictEqual(results.score, 1);
      assert(results.attributes.isInline);
    });

    it('2016-06-28', function() {
      const compose = page20160628().querySelector('[data-test-id=compose]');
      const results = parser(compose);
      assert.deepEqual(results.errors, []);
      assert.strictEqual(results.score, 1);
      assert(results.attributes.isInline);
    });

    it('2016-06-28-2', function() {
      const compose = page20160628_2().querySelector('[data-test-id=compose]');
      const results = parser(compose);
      assert.deepEqual(results.errors, []);
      assert.strictEqual(results.score, 1);
      assert(!results.attributes.isInline);
    });

    it('2016-06-29', function() {
      const compose = page20160629().querySelector('[data-test-id=compose]');
      const results = parser(compose);
      assert.deepEqual(results.errors, []);
      assert.strictEqual(results.score, 1);
      assert(!results.attributes.isInline);
    });

    it('2016-06-29-2', function() {
      const compose = page20160629_2().querySelector('[data-test-id=compose]');
      const results = parser(compose);
      assert.deepEqual(results.errors, []);
      assert.strictEqual(results.score, 1);
      assert(results.attributes.isInline);
    });

    it('2016-06-29-3', function() {
      const compose = page20160629_3().querySelector('[data-test-id=compose]');
      const results = parser(compose);
      assert.deepEqual(results.errors, []);
      assert.strictEqual(results.score, 1);
      assert(results.attributes.isInline);
    });
  });

  describe('watcher', function() {
    it('2016-06-14', function(cb) {
      const compose1 = page20160614().querySelector('[data-test-id=compose1]');
      const compose2 = page20160614().querySelector('[data-test-id=compose2]');
      const inlineCompose = page20160614().querySelector('[data-test-id=inlinecompose]');

      const spy = sinon.spy();
      watcher(page20160614())
        .takeUntilBy(Kefir.later(50))
        .onValue(spy)
        .onEnd(() => {
          const results = spy.args.map(callArgs => callArgs[0].el);
          assert.strictEqual(results.length, 3);
          assert(_.includes(results, compose1));
          assert(_.includes(results, compose2));
          assert(_.includes(results, inlineCompose));
          cb();
        });
    });

    it('2016-06-14 with chat sidebar', function(cb) {
      const compose1 = pageWithSidebar20160614().querySelector('[data-test-id=compose1]');

      const spy = sinon.spy();
      watcher(pageWithSidebar20160614())
        .takeUntilBy(Kefir.later(50))
        .onValue(spy)
        .onEnd(() => {
          const results = spy.args.map(callArgs => callArgs[0].el);
          assert.strictEqual(results.length, 1);
          assert(_.includes(results, compose1));
          cb();
        });
    });

    it('2016-06-20 fullscreen and bundled inline', function(cb) {
      const bundledInlineCompose = pageFullscreen20160620().querySelector('[data-test-id=bundledInlineCompose]');
      const fullscreenCompose = pageFullscreen20160620().querySelector('[data-test-id=fullscreenCompose]');

      const spy = sinon.spy();
      watcher(pageFullscreen20160620())
        .takeUntilBy(Kefir.later(50))
        .onValue(spy)
        .onEnd(() => {
          const results = spy.args.map(callArgs => callArgs[0].el);
          assert.strictEqual(results.length, 2);
          assert(_.includes(results, bundledInlineCompose));
          assert(_.includes(results, fullscreenCompose));
          cb();
        });
    });

    it('2016-06-28 inline compose in search page', function(cb) {
      const compose = page20160628().querySelector('[data-test-id=compose]');

      const spy = sinon.spy();
      watcher(page20160628())
        .takeUntilBy(Kefir.later(50))
        .onValue(spy)
        .onEnd(() => {
          const results = spy.args.map(callArgs => callArgs[0].el);
          assert.strictEqual(results.length, 1);
          assert(_.includes(results, compose));
          cb();
        });
    });

    it('2016-06-28-2 regular compose', function(cb) {
      const compose = page20160628_2().querySelector('[data-test-id=compose]');

      const spy = sinon.spy();
      watcher(page20160628_2())
        .takeUntilBy(Kefir.later(50))
        .onValue(spy)
        .onEnd(() => {
          const results = spy.args.map(callArgs => callArgs[0].el);
          assert.strictEqual(results.length, 1);
          assert(_.includes(results, compose));
          cb();
        });
    });
  });
});
