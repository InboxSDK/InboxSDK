/* @flow */

import _ from 'lodash';
import fs from 'fs';
import assert from 'assert';
import sinon from 'sinon';
import Kefir from 'kefir';
import jsdomDoc from './lib/jsdom-doc';
import fakePageGlobals from './lib/fake-page-globals';

import finder from '../src/platform-implementation-js/dom-driver/inbox/detection/message/finder';
import parser from '../src/platform-implementation-js/dom-driver/inbox/detection/message/parser';
import watcher from '../src/platform-implementation-js/dom-driver/inbox/detection/message/watcher';

import {
  page20160614,
  pageFullscreen20160620,
} from './lib/pages';

describe('Inbox Message Detection', function() {
  this.slow(5000);
  this.timeout(10000);

  fakePageGlobals();

  describe('finder', function() {
    it('2016-06-14', function() {
      const message = page20160614().querySelector('[data-test-id=message]');

      const results = finder(page20160614());
      assert.strictEqual(results.length, 1);
      assert(_.includes(results, message));
    });

    it('2016-06-20 fullscreen and bundled inline', function() {
      const message = pageFullscreen20160620().querySelector('[data-test-id=message]');

      const results = finder(pageFullscreen20160620());
      assert.strictEqual(results.length, 1);
      assert(_.includes(results, message));
    });
  });

  describe('parser', function() {
    it('2016-06-14 inline', function() {
      const message = page20160614().querySelector('[data-test-id=message]');
      const results = parser(message);
      assert.deepEqual(results.errors, []);
      assert.strictEqual(results.score, 1);
      assert.strictEqual(results.attributes.messageId, '14ff3f449377ba4e');
    });

    it('2016-06-20 bundled inline', function() {
      const message = pageFullscreen20160620().querySelector('[data-test-id=message]');
      const results = parser(message);
      assert.deepEqual(results.errors, []);
      assert.strictEqual(results.score, 1);
      assert.strictEqual(results.attributes.messageId, '150058a7ecc2fea4');
    });
  });

  describe('watcher', function() {
    it('2016-06-14', function(cb) {
      const message = page20160614().querySelector('[data-test-id=message]');

      const spy = sinon.spy();
      watcher(page20160614())
        .takeUntilBy(Kefir.later(50))
        .onValue(spy)
        .onEnd(() => {
          const results = spy.args.map(callArgs => callArgs[0].el);
          assert.strictEqual(results.length, 1);
          assert(_.includes(results, message));
          cb();
        });
    });

    it('2016-06-20 fullscreen and bundled inline', function(cb) {
      const message = pageFullscreen20160620().querySelector('[data-test-id=message]');

      const spy = sinon.spy();
      watcher(pageFullscreen20160620())
        .takeUntilBy(Kefir.later(50))
        .onValue(spy)
        .onEnd(() => {
          const results = spy.args.map(callArgs => callArgs[0].el);
          assert.strictEqual(results.length, 1);
          assert(_.includes(results, message));
          cb();
        });
    });
  });
});
