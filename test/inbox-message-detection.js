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
import parser from '../src/platform-implementation-js/dom-driver/inbox/detection/message/parser';

function finder(document) {
  const {documentElement} = document;
  if (!documentElement) throw new Error();
  return pageParserOptions.finders.message.fn(documentElement);
}

import {
  page20160614,
  pageFullscreen20160620,
  page20160810,
  page20160810_2,
  page20160818_2,
  page20160819,
} from './lib/pages';

describe('Inbox Message Detection', function() {
  this.slow(5000);
  this.timeout(10000);

  fakePageGlobals();

  describe('finder', function() {
    it('2016-06-14', function() {
      const message = querySelector(page20160614(), '[data-test-id=message]');

      const results = finder(page20160614());
      assert.strictEqual(results.length, 1);
      assert(_.includes(results, message));
    });

    it('2016-06-20 fullscreen and bundled inline', function() {
      const message = querySelector(pageFullscreen20160620(), '[data-test-id=message]');

      const results = finder(pageFullscreen20160620());
      assert.strictEqual(results.length, 1);
      assert(_.includes(results, message));
    });

    it('2016-08-10 message', function() {
      const message = querySelector(page20160810(), '[data-test-id=message]');

      const results = finder(page20160810());
      assert.strictEqual(results.length, 1);
      assert(_.includes(results, message));
    });

    it('2016-08-10 message with attachments', function() {
      const message = querySelector(page20160810_2(), '[data-test-id=message]');

      const results = finder(page20160810_2());
      assert.strictEqual(results.length, 1);
      assert(_.includes(results, message));
    });

    it('2016-08-18', function() {
      const message = querySelector(page20160818_2(), '[data-test-id=message]');

      const results = finder(page20160818_2());
      assert.strictEqual(results.length, 1);
      assert(_.includes(results, message));
    });

    it('2016-08-19 draft in thread', function() {
      const message = querySelector(page20160819(), '[data-test-id=message]');

      const results = finder(page20160819());
      assert.strictEqual(results.length, 1);
      assert(_.includes(results, message));
    });
  });

  describe('parser', function() {
    it('2016-06-14 inline', function() {
      const message = querySelector(page20160614(), '[data-test-id=message]');
      const results = parser(message);
      assert.deepEqual(results.errors, []);
      assert.strictEqual(results.score, 1);
      assert(results.attributes.loaded);
      assert.strictEqual(results.attributes.isDraft, false);
      assert.strictEqual(results.attributes.viewState, 'EXPANDED');
      assert.strictEqual(results.attributes.inboxMessageId, 'msg-f:1512997563584199246');
    });

    it('2016-06-20 bundled inline', function() {
      const message = querySelector(pageFullscreen20160620(), '[data-test-id=message]');
      const results = parser(message);
      assert.deepEqual(results.errors, []);
      assert.strictEqual(results.score, 1);
      assert(results.attributes.loaded);
      assert.strictEqual(results.attributes.isDraft, false);
      assert.strictEqual(results.attributes.viewState, 'EXPANDED');
      assert.strictEqual(results.attributes.inboxMessageId, 'msg-f:1513306953051471524');
    });

    it('2016-08-10 message', function() {
      const message = querySelector(page20160810(), '[data-test-id=message]');
      const results = parser(message);
      assert.deepEqual(results.errors, []);
      assert.strictEqual(results.score, 1);
      assert(results.attributes.loaded);
      assert.strictEqual(results.attributes.isDraft, false);
      assert.strictEqual(results.attributes.viewState, 'EXPANDED');
      assert.strictEqual(results.attributes.inboxMessageId, 'msg-f:1542295687109342844');
    });

    it('2016-08-10 message with attachments', function() {
      const message = querySelector(page20160810_2(), '[data-test-id=message]');
      const results = parser(message);
      assert.deepEqual(results.errors, []);
      assert.strictEqual(results.score, 1);
      assert(results.attributes.loaded);
      assert.strictEqual(results.attributes.isDraft, false);
      assert.strictEqual(results.attributes.viewState, 'EXPANDED');
      assert.strictEqual(results.attributes.inboxMessageId, 'msg-a:r7822902296672552911');
    });

    it('2016-08-18', function() {
      const message = querySelector(page20160818_2(), '[data-test-id=message]');
      const results = parser(message);
      assert.deepEqual(results.errors, []);
      assert.strictEqual(results.score, 1);
      assert(results.attributes.loaded);
      assert.strictEqual(results.attributes.isDraft, false);
      assert.strictEqual(results.attributes.viewState, 'EXPANDED');
      assert.strictEqual(results.attributes.inboxMessageId, 'msg-f:1542955973201340003');
    });

    it('2016-08-19 draft in thread', function() {
      const message = querySelector(page20160819(), '[data-test-id=message]');
      const results = parser(message);
      assert.deepEqual(results.errors, []);
      assert.strictEqual(results.score, 1);
      assert.strictEqual(results.attributes.isDraft, true);
      assert.strictEqual(results.attributes.inboxMessageId, 'msg-a:r-663027805731183423');
    });
  });

  describe('watcher', function() {
    it('2016-06-14', function() {
      const message = querySelector(page20160614(), '[data-test-id=message]');

      const spy = sinon.spy();
      const root = page20160614();
      const liveSet = makePageParserTree(null, root).tree.getAllByTag('message');
      assert.strictEqual(liveSet.values().size, 1);
      assert(lsMap(liveSet, x => x.getValue()).values().has(message));
    });

    it('2016-06-20 fullscreen and bundled inline', function() {
      const message = querySelector(pageFullscreen20160620(), '[data-test-id=message]');

      const spy = sinon.spy();
      const root = pageFullscreen20160620();
      const liveSet = makePageParserTree(null, root).tree.getAllByTag('message');
      assert.strictEqual(liveSet.values().size, 1);
      assert(lsMap(liveSet, x => x.getValue()).values().has(message));
    });

    it('2016-08-10 message', function() {
      const message = querySelector(page20160810(), '[data-test-id=message]');

      const spy = sinon.spy();
      const root = page20160810();
      const liveSet = makePageParserTree(null, root).tree.getAllByTag('message');
      assert.strictEqual(liveSet.values().size, 1);
      assert(lsMap(liveSet, x => x.getValue()).values().has(message));
    });

    it('2016-08-10 message with attachments', function() {
      const message = querySelector(page20160810_2(), '[data-test-id=message]');

      const spy = sinon.spy();
      const root = page20160810_2();
      const liveSet = makePageParserTree(null, root).tree.getAllByTag('message');
      assert.strictEqual(liveSet.values().size, 1);
      assert(lsMap(liveSet, x => x.getValue()).values().has(message));
    });

    it('2016-08-18', function() {
      const message = querySelector(page20160818_2(), '[data-test-id=message]');

      const spy = sinon.spy();
      const root = page20160818_2();
      const liveSet = makePageParserTree(null, root).tree.getAllByTag('message');
      assert.strictEqual(liveSet.values().size, 1);
      assert(lsMap(liveSet, x => x.getValue()).values().has(message));
    });

    it('2016-08-19 draft in thread', function() {
      const message = querySelector(page20160819(), '[data-test-id=message]');

      const spy = sinon.spy();
      const root = page20160819();
      const liveSet = makePageParserTree(null, root).tree.getAllByTag('message');
      assert.strictEqual(liveSet.values().size, 1);
      assert(lsMap(liveSet, x => x.getValue()).values().has(message));
    });
  });
});
