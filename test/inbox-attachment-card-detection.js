/* @flow */

import _ from 'lodash';
import fs from 'fs';
import assert from 'assert';
import sinon from 'sinon';
import Kefir from 'kefir';
import jsdomDoc from './lib/jsdom-doc';
import fakePageGlobals from './lib/fake-page-globals';

import finder from '../src/platform-implementation-js/dom-driver/inbox/detection/attachmentCard/finder';
import parser from '../src/platform-implementation-js/dom-driver/inbox/detection/attachmentCard/parser';
import watcher from '../src/platform-implementation-js/dom-driver/inbox/detection/attachmentCard/watcher';

import {
  page20160810_2,
  page20160812,
  page20160816,
  page20160908,
} from './lib/pages';

describe('Inbox Attachment Card Detection', function() {
  this.slow(5000);
  this.timeout(10000);

  fakePageGlobals();

  describe('finder', function() {
    it('2016-08-10 message with attachments', function() {
      const attachment1 = page20160810_2().querySelector('[data-test-id=attachment1]');
      const attachment2 = page20160810_2().querySelector('[data-test-id=attachment2]');
      const attachment3 = page20160810_2().querySelector('[data-test-id=attachment3]');
      const attachment4 = page20160810_2().querySelector('[data-test-id=attachment4]');
      const attachment5 = page20160810_2().querySelector('[data-test-id=attachment5]');

      const results = finder(page20160810_2());
      assert.strictEqual(results.length, 5);
      assert(results.includes(attachment1));
      assert(results.includes(attachment2));
      assert(results.includes(attachment3));
      assert(results.includes(attachment4));
      assert(results.includes(attachment5));
    });

    it('2016-08-12 list with card', function() {
      const attachment1 = page20160812().querySelector('[data-test-id=attachment1]');
      const results = finder(page20160812());
      assert.strictEqual(results.length, 1);
      assert(results.includes(attachment1));
    });

    it('2016-08-16 message with attachment', function() {
      const attachment1 = page20160816().querySelector('[data-test-id=attachment1]');
      const results = finder(page20160816());
      assert.strictEqual(results.length, 1);
      assert(results.includes(attachment1));
    });

    it('2016-09-08 card in bundle', function() {
      const attachment1 = page20160908().querySelector('[data-test-id=attachment1]');
      const results = finder(page20160908());
      assert.strictEqual(results.length, 1);
      assert(results.includes(attachment1));
    });
  });

  describe('parser', function() {
    it('2016-08-10 message with attachments', function() {
      {
        const results = parser(page20160810_2().querySelector('[data-test-id=attachment1]'));
        assert.deepEqual(results.errors, []);
        assert.strictEqual(results.score, 1);
      }
      {
        const results = parser(page20160810_2().querySelector('[data-test-id=attachment2]'));
        assert.deepEqual(results.errors, []);
        assert.strictEqual(results.score, 1);
      }
      {
        const results = parser(page20160810_2().querySelector('[data-test-id=attachment3]'));
        assert.deepEqual(results.errors, []);
        assert.strictEqual(results.score, 1);
      }
      {
        const results = parser(page20160810_2().querySelector('[data-test-id=attachment4]'));
        assert.deepEqual(results.errors, []);
        assert.strictEqual(results.score, 1);
      }
      {
        const results = parser(page20160810_2().querySelector('[data-test-id=attachment5]'));
        assert.deepEqual(results.errors, []);
        assert.strictEqual(results.score, 1);
      }
    });

    it('2016-08-12 list with card', function() {
      const results = parser(page20160812().querySelector('[data-test-id=attachment1]'));
      assert.deepEqual(results.errors, []);
      assert.strictEqual(results.score, 1);
    });

    it('2016-08-16 message with attachment', function() {
      const results = parser(page20160816().querySelector('[data-test-id=attachment1]'));
      assert.deepEqual(results.errors, []);
      assert.strictEqual(results.score, 1);
    });

    it('2016-09-08 card in bundle', function() {
      const results = parser(page20160908().querySelector('[data-test-id=attachment1]'));
      assert.deepEqual(results.errors, []);
      assert.strictEqual(results.score, 1);
    });
  });

  describe('watcher', function() {
    it('2016-08-10 message with attachments', function(cb) {
      const attachment1 = page20160810_2().querySelector('[data-test-id=attachment1]');
      const attachment2 = page20160810_2().querySelector('[data-test-id=attachment2]');
      const attachment3 = page20160810_2().querySelector('[data-test-id=attachment3]');
      const attachment4 = page20160810_2().querySelector('[data-test-id=attachment4]');
      const attachment5 = page20160810_2().querySelector('[data-test-id=attachment5]');

      const spy = sinon.spy();
      watcher(page20160810_2())
        .takeUntilBy(Kefir.later(50))
        .onValue(spy)
        .onEnd(() => {
          const results = spy.args.map(callArgs => callArgs[0].el);
          assert.strictEqual(results.length, 5);
          assert(results.includes(attachment1));
          assert(results.includes(attachment2));
          assert(results.includes(attachment3));
          assert(results.includes(attachment4));
          assert(results.includes(attachment5));
          cb();
        });
    });

    it('2016-08-12 list with card', function(cb) {
      const attachment1 = page20160812().querySelector('[data-test-id=attachment1]');

      const spy = sinon.spy();
      watcher(page20160812())
        .takeUntilBy(Kefir.later(50))
        .onValue(spy)
        .onEnd(() => {
          const results = spy.args.map(callArgs => callArgs[0].el);
          assert.strictEqual(results.length, 1);
          assert(results.includes(attachment1));
          cb();
        });
    });

    it('2016-08-16 message with attachment', function(cb) {
      const attachment1 = page20160816().querySelector('[data-test-id=attachment1]');

      const spy = sinon.spy();
      watcher(page20160816())
        .takeUntilBy(Kefir.later(50))
        .onValue(spy)
        .onEnd(() => {
          const results = spy.args.map(callArgs => callArgs[0].el);
          assert.strictEqual(results.length, 1);
          assert(results.includes(attachment1));
          cb();
        });
    });

    it('2016-09-08 card in bundle', function(cb) {
      const attachment1 = page20160908().querySelector('[data-test-id=attachment1]');

      const spy = sinon.spy();
      watcher(page20160908())
        .takeUntilBy(Kefir.later(50))
        .onValue(spy)
        .onEnd(() => {
          const results = spy.args.map(callArgs => callArgs[0].el);
          assert.strictEqual(results.length, 1);
          assert(results.includes(attachment1));
          cb();
        });
    });
  });
});
