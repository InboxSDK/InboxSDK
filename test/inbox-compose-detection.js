/* @flow */

import _ from 'lodash';
import fs from 'fs';
import assert from 'assert';
import sinon from 'sinon';
import Kefir from 'kefir';
import jsdomDoc from './lib/jsdom-doc';
import fakePageGlobals from './lib/fake-page-globals';
import querySelector from '../src/platform-implementation-js/lib/dom/querySelectorOrFail';

import makePageParserTree from '../src/platform-implementation-js/dom-driver/inbox/makePageParserTree';
import toItemWithLifetimePool from '../src/platform-implementation-js/lib/toItemWithLifetimePool';

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
  page20160629_3,
  page20160818,
  page20161102,
} from './lib/pages';

function makeThreadRowElPool(root) {
  return toItemWithLifetimePool(
    makePageParserTree(null, root).tree.getAllByTag('threadRow')
  );
}

describe('Inbox Compose Detection', function() {
  this.slow(5000);
  this.timeout(10000);

  fakePageGlobals();

  describe('finder', function() {
    it('2016-06-14', function() {
      const compose1 = querySelector(page20160614(), '[data-test-id=compose1]');
      const compose2 = querySelector(page20160614(), '[data-test-id=compose2]');
      const inlineCompose = querySelector(page20160614(), '[data-test-id=inlinecompose]');

      const results = finder(page20160614());
      assert.strictEqual(results.length, 3);
      assert(_.includes(results, compose1));
      assert(_.includes(results, compose2));
      assert(_.includes(results, inlineCompose));
    });

    it('2016-06-14 with chat sidebar', function() {
      const compose1 = querySelector(pageWithSidebar20160614(), '[data-test-id=compose1]');

      const results = finder(pageWithSidebar20160614());
      assert.strictEqual(results.length, 1);
      assert(_.includes(results, compose1));
    });

    it('2016-06-20 fullscreen and bundled inline', function() {
      const bundledInlineCompose = querySelector(pageFullscreen20160620(), '[data-test-id=bundledInlineCompose]');
      const fullscreenCompose = querySelector(pageFullscreen20160620(), '[data-test-id=fullscreenCompose]');

      const results = finder(pageFullscreen20160620());
      assert.strictEqual(results.length, 2);
      assert(_.includes(results, bundledInlineCompose));
      assert(_.includes(results, fullscreenCompose));
    });

    it('2016-06-28', function() {
      const compose = querySelector(page20160628(), '[data-test-id=compose]');

      const results = finder(page20160628());
      assert.strictEqual(results.length, 1);
      assert(_.includes(results, compose));
    });

    it('2016-06-28-2', function() {
      const compose = querySelector(page20160628_2(), '[data-test-id=compose]');

      const results = finder(page20160628_2());
      assert.strictEqual(results.length, 1);
      assert(_.includes(results, compose));
    });

    it('2016-08-18', function() {
      const compose = querySelector(page20160818(), '[data-test-id=compose]');

      const results = finder(page20160818());
      assert.strictEqual(results.length, 1);
      assert(results.includes(compose));
    });

    it('2016-11-02 inline compose', function() {
      const compose = querySelector(page20161102(), '[data-test-id=compose]');

      const results = finder(page20161102());
      assert.strictEqual(results.length, 1);
      assert(results.includes(compose));
    });
  });

  describe('parser', function() {
    it('2016-06-14', function() {
      const compose = querySelector(page20160614(), '[data-test-id=compose1]');
      const results = parser(compose);
      assert.deepEqual(results.errors, []);
      assert.strictEqual(results.score, 1);
      assert(!results.attributes.isInline);
    });

    it('2016-06-14 inline', function() {
      const compose = querySelector(page20160614(), '[data-test-id=inlinecompose]');
      const results = parser(compose);
      assert.deepEqual(results.errors, []);
      assert.strictEqual(results.score, 1);
      assert(results.attributes.isInline);
    });

    it('2016-06-20 fullscreen', function() {
      const fullscreenCompose = querySelector(pageFullscreen20160620(), '[data-test-id=fullscreenCompose]');
      const results = parser(fullscreenCompose);
      assert.deepEqual(results.errors, []);
      assert.strictEqual(results.score, 1);
      assert(!results.attributes.isInline);
    });

    it('2016-06-20 bundled inline', function() {
      const bundledInlineCompose = querySelector(pageFullscreen20160620(), '[data-test-id=bundledInlineCompose]');
      const results = parser(bundledInlineCompose);
      assert.deepEqual(results.errors, []);
      assert.strictEqual(results.score, 1);
      assert(results.attributes.isInline);
    });

    it('2016-06-28', function() {
      const compose = querySelector(page20160628(), '[data-test-id=compose]');
      const results = parser(compose);
      assert.deepEqual(results.errors, []);
      assert.strictEqual(results.score, 1);
      assert(results.attributes.isInline);
    });

    it('2016-06-28-2', function() {
      const compose = querySelector(page20160628_2(), '[data-test-id=compose]');
      const results = parser(compose);
      assert.deepEqual(results.errors, []);
      assert.strictEqual(results.score, 1);
      assert(!results.attributes.isInline);
    });

    it('2016-06-29', function() {
      const compose = querySelector(page20160629(), '[data-test-id=compose]');
      const results = parser(compose);
      assert.deepEqual(results.errors, []);
      assert.strictEqual(results.score, 1);
      assert(!results.attributes.isInline);
    });

    it('2016-06-29-2', function() {
      const compose = querySelector(page20160629_2(), '[data-test-id=compose]');
      const results = parser(compose);
      assert.deepEqual(results.errors, []);
      assert.strictEqual(results.score, 1);
      assert(results.attributes.isInline);
    });

    it('2016-06-29-3', function() {
      const compose = querySelector(page20160629_3(), '[data-test-id=compose]');
      const results = parser(compose);
      assert.deepEqual(results.errors, []);
      assert.strictEqual(results.score, 1);
      assert(results.attributes.isInline);
    });

    it('2016-08-18', function() {
      const compose = querySelector(page20160818(), '[data-test-id=compose]');
      const results = parser(compose);
      assert.deepEqual(results.errors, []);
      assert.strictEqual(results.score, 1);
      assert(results.attributes.isInline);
    });

    it('2016-11-02 inline compose', function() {
      const compose = querySelector(page20161102(), '[data-test-id=compose]');
      const results = parser(compose);
      assert.deepEqual(results.errors, []);
      assert.strictEqual(results.score, 1);
      assert(results.attributes.isInline);
    });
  });

  describe('watcher', function() {
    it('2016-06-14', function(cb) {
      const compose1 = querySelector(page20160614(), '[data-test-id=compose1]');
      const compose2 = querySelector(page20160614(), '[data-test-id=compose2]');
      const inlineCompose = querySelector(page20160614(), '[data-test-id=inlinecompose]');

      const spy = sinon.spy();
      watcher(page20160614(), makeThreadRowElPool(page20160614()))
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
      const compose1 = querySelector(pageWithSidebar20160614(), '[data-test-id=compose1]');

      const spy = sinon.spy();
      watcher(pageWithSidebar20160614(), makeThreadRowElPool(pageWithSidebar20160614()))
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
      const bundledInlineCompose = querySelector(pageFullscreen20160620(), '[data-test-id=bundledInlineCompose]');
      const fullscreenCompose = querySelector(pageFullscreen20160620(), '[data-test-id=fullscreenCompose]');

      const spy = sinon.spy();
      watcher(pageFullscreen20160620(), makeThreadRowElPool(pageFullscreen20160620()))
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
      const compose = querySelector(page20160628(), '[data-test-id=compose]');

      const spy = sinon.spy();
      watcher(page20160628(), makeThreadRowElPool(page20160628()))
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
      const compose = querySelector(page20160628_2(), '[data-test-id=compose]');

      const spy = sinon.spy();
      watcher(page20160628_2(), makeThreadRowElPool(page20160628_2()))
        .takeUntilBy(Kefir.later(50))
        .onValue(spy)
        .onEnd(() => {
          const results = spy.args.map(callArgs => callArgs[0].el);
          assert.strictEqual(results.length, 1);
          assert(_.includes(results, compose));
          cb();
        });
    });

    it('2016-08-18 inline compose', function(cb) {
      const compose = querySelector(page20160818(), '[data-test-id=compose]');

      const spy = sinon.spy();
      watcher(page20160818(), makeThreadRowElPool(page20160818()))
        .takeUntilBy(Kefir.later(50))
        .onValue(spy)
        .onEnd(() => {
          const results = spy.args.map(callArgs => callArgs[0].el);
          assert.strictEqual(results.length, 1);
          assert(_.includes(results, compose));
          cb();
        });
    });

    it('2016-11-02 inline compose', function(cb) {
      const compose = querySelector(page20161102(), '[data-test-id=compose]');

      const spy = sinon.spy();
      watcher(page20161102(), makeThreadRowElPool(page20161102()))
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
