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
      assert(_.includes(results, attachment1));
      assert(_.includes(results, attachment2));
      assert(_.includes(results, attachment3));
      assert(_.includes(results, attachment4));
      assert(_.includes(results, attachment5));
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
          assert(_.includes(results, attachment1));
          assert(_.includes(results, attachment2));
          assert(_.includes(results, attachment3));
          assert(_.includes(results, attachment4));
          assert(_.includes(results, attachment5));
          cb();
        });
    });
  });
});
