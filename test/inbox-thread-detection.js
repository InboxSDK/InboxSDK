/* @flow */

import _ from 'lodash';
import fs from 'fs';
import assert from 'assert';
import Kefir from 'kefir';
import lsMap from 'live-set/map';
import jsdomDoc from './lib/jsdom-doc';
import fakePageGlobals from './lib/fake-page-globals';
import querySelector from '../src/platform-implementation-js/lib/dom/querySelectorOrFail';

import makePageParserTree from './lib/makePageParserTree';
import pageParserOptions from '../src/platform-implementation-js/dom-driver/inbox/pageParserOptions';
import parser from '../src/platform-implementation-js/dom-driver/inbox/detection/thread/parser';

function finder(document) {
  const {documentElement} = document;
  if (!documentElement) throw new Error();
  return pageParserOptions.finders.thread.fn(documentElement);
}

import {
  page20160614,
  pageFullscreen20160620,
  page20160727,
  page20160823,
  page20170317,
} from './lib/pages-old';

describe('Inbox Thread Detection', function() {
  this.slow(5000);
  this.timeout(10000);

  fakePageGlobals();

  describe('finder', function() {
    it('2016-06-14', function() {
      const thread = querySelector(page20160614(), '[data-test-id=openthread]');

      const results = finder(page20160614());
      assert.strictEqual(results.length, 1);
      assert(_.includes(results, thread));
    });

    it('2016-06-20 fullscreen and bundled inline', function() {
      const thread = querySelector(pageFullscreen20160620(), '[data-test-id=openthread]');

      const results = finder(pageFullscreen20160620());
      assert.strictEqual(results.length, 1);
      assert(_.includes(results, thread));
    });

    it('2016-07-27 search', function() {
      const thread = querySelector(page20160727(), '[data-test-id=openthread]');

      const results = finder(page20160727());
      assert.strictEqual(results.length, 1);
      assert(_.includes(results, thread));
    });

    it('2016-08-23 thread in bundle', function() {
      const thread = querySelector(page20160823(), '[data-test-id=openthread]');

      const results = finder(page20160823());
      assert.strictEqual(results.length, 1);
      assert(_.includes(results, thread));
    });

    it('2017-03-17 thread', function() {
      const thread = querySelector(page20170317(), '[data-test-id=thread]');

      const results = finder(page20170317());
      assert.strictEqual(results.length, 1);
      assert(_.includes(results, thread));
    });
  });

  describe('parser', function() {
    it('2016-06-14 inline', function() {
      const thread = querySelector(page20160614(), '[data-test-id=openthread]');
      const results = parser(thread);
      assert.deepEqual(results.errors, []);
      assert.strictEqual(results.score, 1);
      assert(!results.attributes.inBundle);
      assert.strictEqual(results.attributes.inboxThreadId, 'thread-f:1512997563584199246');
    });

    it('2016-06-20 bundled inline', function() {
      const thread = querySelector(pageFullscreen20160620(), '[data-test-id=openthread]');
      const results = parser(thread);
      assert.deepEqual(results.errors, []);
      assert.strictEqual(results.score, 1);
      assert(results.attributes.inBundle);
      assert.strictEqual(results.attributes.inboxThreadId, 'thread-f:1513306953051471524');
    });

    it('2016-07-27 search', function() {
      const thread = querySelector(page20160727(), '[data-test-id=openthread]');
      const results = parser(thread);
      assert.deepEqual(results.errors, []);
      assert.strictEqual(results.score, 1);
      assert(!results.attributes.inBundle);
      assert.strictEqual(results.attributes.inboxThreadId, 'thread-f:1513627950174214078');
    });

    it('2016-08-23 thread in bundle', function() {
      const thread = querySelector(page20160823(), '[data-test-id=openthread]');
      const results = parser(thread);
      assert.deepEqual(results.errors, []);
      assert.strictEqual(results.score, 1);
      assert(results.attributes.inBundle);
      assert.strictEqual(results.attributes.inboxThreadId, 'thread-f:1543480514786604144');
    });

    it('2017-03-17 thread', function() {
      const thread = querySelector(page20170317(), '[data-test-id=thread]');
      const results = parser(thread);
      assert.deepEqual(results.errors, []);
      assert.strictEqual(results.score, 1);
      assert(!results.attributes.inBundle);
      assert.strictEqual(results.attributes.inboxThreadId, 'thread-f:1562058394397337503');
    });
  });

  describe('watcher', function() {
    it('2016-06-14', function() {
      const thread = querySelector(page20160614(), '[data-test-id=openthread]');

      const root = page20160614();
      const liveSet = makePageParserTree(null, root).tree.getAllByTag('thread');
      assert.strictEqual(liveSet.values().size, 1);
      assert(lsMap(liveSet, x => x.getValue()).values().has(thread));
    });

    it('2016-06-20 fullscreen and bundled inline', function() {
      const thread = querySelector(pageFullscreen20160620(), '[data-test-id=openthread]');

      const root = pageFullscreen20160620();
      const liveSet = makePageParserTree(null, root).tree.getAllByTag('thread');
      assert.strictEqual(liveSet.values().size, 1);
      assert(lsMap(liveSet, x => x.getValue()).values().has(thread));
    });

    it('2016-07-27 search', function() {
      const thread = querySelector(page20160727(), '[data-test-id=openthread]');

      const root = page20160727();
      const liveSet = makePageParserTree(null, root).tree.getAllByTag('thread');
      assert.strictEqual(liveSet.values().size, 1);
      assert(lsMap(liveSet, x => x.getValue()).values().has(thread));
    });

    it('2016-08-23 thread in bundle', function() {
      const thread = querySelector(page20160823(), '[data-test-id=openthread]');

      const root = page20160823();
      const liveSet = makePageParserTree(null, root).tree.getAllByTag('thread');
      assert.strictEqual(liveSet.values().size, 1);
      assert(lsMap(liveSet, x => x.getValue()).values().has(thread));
    });

    it('2017-03-17 thread', function() {
      const thread = querySelector(page20170317(), '[data-test-id=thread]');

      const root = page20170317();
      const liveSet = makePageParserTree(null, root).tree.getAllByTag('thread');
      assert.strictEqual(liveSet.values().size, 1);
      assert(lsMap(liveSet, x => x.getValue()).values().has(thread));
    });
  });
});
