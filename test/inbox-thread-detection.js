/* @flow */

import _ from 'lodash';
import fs from 'fs';
import assert from 'assert';
import sinon from 'sinon';
import Kefir from 'kefir';
import jsdomDoc from './lib/jsdom-doc';
import fakePageGlobals from './lib/fake-page-globals';

import finder from '../src/platform-implementation-js/dom-driver/inbox/detection/thread/finder';
import parser from '../src/platform-implementation-js/dom-driver/inbox/detection/thread/parser';
import watcher from '../src/platform-implementation-js/dom-driver/inbox/detection/thread/watcher';

import {
  page20160614,
  pageFullscreen20160620,
  page20160727,
  page20160823,
} from './lib/pages';

describe('Inbox Thread Detection', function() {
  this.slow(5000);
  this.timeout(10000);

  fakePageGlobals();

  describe('finder', function() {
    it('2016-06-14', function() {
      const thread = page20160614().querySelector('[data-test-id=openthread]');

      const results = finder(page20160614());
      assert.strictEqual(results.length, 1);
      assert(_.includes(results, thread));
    });

    it('2016-06-20 fullscreen and bundled inline', function() {
      const thread = pageFullscreen20160620().querySelector('[data-test-id=openthread]');

      const results = finder(pageFullscreen20160620());
      assert.strictEqual(results.length, 1);
      assert(_.includes(results, thread));
    });

    it('2016-07-27 search', function() {
      const thread = page20160727().querySelector('[data-test-id=openthread]');

      const results = finder(page20160727());
      assert.strictEqual(results.length, 1);
      assert(_.includes(results, thread));
    });

    it('2016-08-23 thread in bundle', function() {
      const thread = page20160823().querySelector('[data-test-id=openthread]');

      const results = finder(page20160823());
      assert.strictEqual(results.length, 1);
      assert(_.includes(results, thread));
    });
  });

  describe('parser', function() {
    it('2016-06-14 inline', function() {
      const thread = page20160614().querySelector('[data-test-id=openthread]');
      const results = parser(thread);
      assert.deepEqual(results.errors, []);
      assert.strictEqual(results.score, 1);
      assert(!results.attributes.inBundle);
      assert.strictEqual(results.attributes.threadId, '14ff3f449377ba4e');
    });

    it('2016-06-20 bundled inline', function() {
      const thread = pageFullscreen20160620().querySelector('[data-test-id=openthread]');
      const results = parser(thread);
      assert.deepEqual(results.errors, []);
      assert.strictEqual(results.score, 1);
      assert(results.attributes.inBundle);
      assert.strictEqual(results.attributes.threadId, '150058a7ecc2fea4');
    });

    it('2016-07-27 search', function() {
      const thread = page20160727().querySelector('[data-test-id=openthread]');
      const results = parser(thread);
      assert.deepEqual(results.errors, []);
      assert.strictEqual(results.score, 1);
      assert(!results.attributes.inBundle);
      assert.strictEqual(results.attributes.threadId, '15017c99e43c97be');
    });

    it('2016-08-23 thread in bundle', function() {
      const thread = page20160823().querySelector('[data-test-id=openthread]');
      const results = parser(thread);
      assert.deepEqual(results.errors, []);
      assert.strictEqual(results.score, 1);
      assert(results.attributes.inBundle);
      assert.strictEqual(results.attributes.threadId, '156b8b59b997b470');
    });
  });

  describe('watcher', function() {
    it('2016-06-14', function(cb) {
      const thread = page20160614().querySelector('[data-test-id=openthread]');

      const spy = sinon.spy();
      watcher(page20160614())
        .takeUntilBy(Kefir.later(50))
        .onValue(spy)
        .onEnd(() => {
          const results = spy.args.map(callArgs => callArgs[0].el);
          assert.strictEqual(results.length, 1);
          assert(_.includes(results, thread));
          cb();
        });
    });

    it('2016-06-20 fullscreen and bundled inline', function(cb) {
      const thread = pageFullscreen20160620().querySelector('[data-test-id=openthread]');

      const spy = sinon.spy();
      watcher(pageFullscreen20160620())
        .takeUntilBy(Kefir.later(50))
        .onValue(spy)
        .onEnd(() => {
          const results = spy.args.map(callArgs => callArgs[0].el);
          assert.strictEqual(results.length, 1);
          assert(_.includes(results, thread));
          cb();
        });
    });

    it('2016-07-27 search', function(cb) {
      const thread = page20160727().querySelector('[data-test-id=openthread]');

      const spy = sinon.spy();
      watcher(page20160727())
        .takeUntilBy(Kefir.later(50))
        .onValue(spy)
        .onEnd(() => {
          const results = spy.args.map(callArgs => callArgs[0].el);
          assert.strictEqual(results.length, 1);
          assert(_.includes(results, thread));
          cb();
        });
    });

    it('2016-08-23 thread in bundle', function(cb) {
      const thread = page20160823().querySelector('[data-test-id=openthread]');

      const spy = sinon.spy();
      watcher(page20160823())
        .takeUntilBy(Kefir.later(50))
        .onValue(spy)
        .onEnd(() => {
          const results = spy.args.map(callArgs => callArgs[0].el);
          assert.strictEqual(results.length, 1);
          assert(_.includes(results, thread));
          cb();
        });
    });
  });
});
