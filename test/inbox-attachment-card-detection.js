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
import ItemWithLifetimePool from '../src/platform-implementation-js/lib/ItemWithLifetimePool';
import threadWatcher from '../src/platform-implementation-js/dom-driver/inbox/detection/thread/watcher';
import messageWatcher from '../src/platform-implementation-js/dom-driver/inbox/detection/message/watcher';

import finder from '../src/platform-implementation-js/dom-driver/inbox/detection/attachmentCard/finder';
import parser from '../src/platform-implementation-js/dom-driver/inbox/detection/attachmentCard/parser';
import watcher from '../src/platform-implementation-js/dom-driver/inbox/detection/attachmentCard/watcher';

import {
  page20160810_2,
  page20160812,
  page20160816,
  page20160908,
} from './lib/pages';

function makePools(root) {
  const {tree} = makePageParserTree(null, root);
  const topRowPool = toItemWithLifetimePool(tree.getAllByTag('topRow'));
  const threadRowPool = toItemWithLifetimePool(tree.getAllByTag('threadRow'));
  const threadPool = new ItemWithLifetimePool(threadWatcher(root, threadRowPool));
  const messagePool = new ItemWithLifetimePool(messageWatcher(root, threadPool));
  return [topRowPool, threadRowPool, messagePool];
}

describe('Inbox Attachment Card Detection', function() {
  this.slow(5000);
  this.timeout(10000);

  fakePageGlobals();

  describe('finder', function() {
    it('2016-08-10 message with attachments', function() {
      const attachment1 = querySelector(page20160810_2(), '[data-test-id=attachment1]');
      const attachment2 = querySelector(page20160810_2(), '[data-test-id=attachment2]');
      const attachment3 = querySelector(page20160810_2(), '[data-test-id=attachment3]');
      const attachment4 = querySelector(page20160810_2(), '[data-test-id=attachment4]');
      const attachment5 = querySelector(page20160810_2(), '[data-test-id=attachment5]');

      const results = finder(page20160810_2());
      assert.strictEqual(results.length, 5);
      assert(results.includes(attachment1));
      assert(results.includes(attachment2));
      assert(results.includes(attachment3));
      assert(results.includes(attachment4));
      assert(results.includes(attachment5));
    });

    it('2016-08-12 list with card', function() {
      const attachment1 = querySelector(page20160812(), '[data-test-id=attachment1]');
      const results = finder(page20160812());
      assert.strictEqual(results.length, 1);
      assert(results.includes(attachment1));
    });

    it('2016-08-16 message with attachment', function() {
      const attachment1 = querySelector(page20160816(), '[data-test-id=attachment1]');
      const results = finder(page20160816());
      assert.strictEqual(results.length, 1);
      assert(results.includes(attachment1));
    });

    it('2016-09-08 card in bundle', function() {
      const attachment1 = querySelector(page20160908(), '[data-test-id=attachment1]');
      const results = finder(page20160908());
      assert.strictEqual(results.length, 1);
      assert(results.includes(attachment1));
    });
  });

  describe('parser', function() {
    it('2016-08-10 message with attachments', function() {
      {
        const results = parser(querySelector(page20160810_2(), '[data-test-id=attachment1]'));
        assert.deepEqual(results.errors, []);
        assert.strictEqual(results.score, 1);
      }
      {
        const results = parser(querySelector(page20160810_2(), '[data-test-id=attachment2]'));
        assert.deepEqual(results.errors, []);
        assert.strictEqual(results.score, 1);
      }
      {
        const results = parser(querySelector(page20160810_2(), '[data-test-id=attachment3]'));
        assert.deepEqual(results.errors, []);
        assert.strictEqual(results.score, 1);
      }
      {
        const results = parser(querySelector(page20160810_2(), '[data-test-id=attachment4]'));
        assert.deepEqual(results.errors, []);
        assert.strictEqual(results.score, 1);
      }
      {
        const results = parser(querySelector(page20160810_2(), '[data-test-id=attachment5]'));
        assert.deepEqual(results.errors, []);
        assert.strictEqual(results.score, 1);
      }
    });

    it('2016-08-12 list with card', function() {
      const results = parser(querySelector(page20160812(), '[data-test-id=attachment1]'));
      assert.deepEqual(results.errors, []);
      assert.strictEqual(results.score, 1);
    });

    it('2016-08-16 message with attachment', function() {
      const results = parser(querySelector(page20160816(), '[data-test-id=attachment1]'));
      assert.deepEqual(results.errors, []);
      assert.strictEqual(results.score, 1);
    });

    it('2016-09-08 card in bundle', function() {
      const results = parser(querySelector(page20160908(), '[data-test-id=attachment1]'));
      assert.deepEqual(results.errors, []);
      assert.strictEqual(results.score, 1);
    });
  });

  describe('watcher', function() {
    it('2016-08-10 message with attachments', function(cb) {
      const attachment1 = querySelector(page20160810_2(), '[data-test-id=attachment1]');
      const attachment2 = querySelector(page20160810_2(), '[data-test-id=attachment2]');
      const attachment3 = querySelector(page20160810_2(), '[data-test-id=attachment3]');
      const attachment4 = querySelector(page20160810_2(), '[data-test-id=attachment4]');
      const attachment5 = querySelector(page20160810_2(), '[data-test-id=attachment5]');

      const spy = sinon.spy();
      watcher(page20160810_2(), ...makePools(page20160810_2()))
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
      const attachment1 = querySelector(page20160812(), '[data-test-id=attachment1]');

      const spy = sinon.spy();
      watcher(page20160812(), ...makePools(page20160812()))
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
      const attachment1 = querySelector(page20160816(), '[data-test-id=attachment1]');

      const spy = sinon.spy();
      watcher(page20160816(), ...makePools(page20160816()))
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
      const attachment1 = querySelector(page20160908(), '[data-test-id=attachment1]');

      const spy = sinon.spy();
      watcher(page20160908(), ...makePools(page20160908()))
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
