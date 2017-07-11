/* @flow */

import _ from 'lodash';
import fs from 'fs';
import assert from 'assert';
import sinon from 'sinon';
import Kefir from 'kefir';
import lsMap from 'live-set/map';
import jsdomDoc from './lib/jsdom-doc';
import fakePageGlobals from './lib/fake-page-globals';
import querySelector from '../src/platform-implementation-js/lib/dom/querySelectorOrFail';

import makePageParserTree from './lib/makePageParserTree';
import pageParserOptions from '../src/platform-implementation-js/dom-driver/inbox/pageParserOptions';
import parser from '../src/platform-implementation-js/dom-driver/inbox/detection/attachmentCard/parser';

function finder(document) {
  const {documentElement} = document;
  if (!documentElement) throw new Error();
  return Array.from(pageParserOptions.finders.attachmentCard.fn(documentElement));
}

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
    it('2016-08-10 message with attachments', function() {
      const attachment1 = querySelector(page20160810_2(), '[data-test-id=attachment1]');
      const attachment2 = querySelector(page20160810_2(), '[data-test-id=attachment2]');
      const attachment3 = querySelector(page20160810_2(), '[data-test-id=attachment3]');
      const attachment4 = querySelector(page20160810_2(), '[data-test-id=attachment4]');
      const attachment5 = querySelector(page20160810_2(), '[data-test-id=attachment5]');

      const spy = sinon.spy();
      const root = page20160810_2();
      const liveSet = makePageParserTree(null, root).tree.getAllByTag('attachmentCard');
      assert.strictEqual(liveSet.values().size, 5);
      const elements = lsMap(liveSet, x => x.getValue());
      assert(elements.values().has(attachment1));
      assert(elements.values().has(attachment2));
      assert(elements.values().has(attachment3));
      assert(elements.values().has(attachment4));
      assert(elements.values().has(attachment5));
    });

    it('2016-08-12 list with card', function() {
      const attachment1 = querySelector(page20160812(), '[data-test-id=attachment1]');

      const spy = sinon.spy();
      const root = page20160812();
      const liveSet = makePageParserTree(null, root).tree.getAllByTag('attachmentCard');
      assert.strictEqual(liveSet.values().size, 1);
      const elements = lsMap(liveSet, x => x.getValue());
      assert(elements.values().has(attachment1));
    });

    it('2016-08-16 message with attachment', function() {
      const attachment1 = querySelector(page20160816(), '[data-test-id=attachment1]');

      const spy = sinon.spy();
      const root = page20160816();
      const liveSet = makePageParserTree(null, root).tree.getAllByTag('attachmentCard');
      assert.strictEqual(liveSet.values().size, 1);
      const elements = lsMap(liveSet, x => x.getValue());
      assert(elements.values().has(attachment1));
    });

    it('2016-09-08 card in bundle', function() {
      const attachment1 = querySelector(page20160908(), '[data-test-id=attachment1]');

      const spy = sinon.spy();
      const root = page20160908();
      const liveSet = makePageParserTree(null, root).tree.getAllByTag('attachmentCard');
      assert.strictEqual(liveSet.values().size, 1);
      const elements = lsMap(liveSet, x => x.getValue());
      assert(elements.values().has(attachment1));
    });
  });
});
