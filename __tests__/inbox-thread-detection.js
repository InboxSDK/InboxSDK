/* @flow */

import _ from 'lodash';
import fs from 'fs';
import Kefir from 'kefir';
import lsMap from 'live-set/map';
import querySelector from '../src/platform-implementation-js/lib/dom/querySelectorOrFail';
import MockMutationObserver from '../test/lib/mock-mutation-observer';
global.MutationObserver = MockMutationObserver;

import makePageParserTree from '../test/lib/makePageParserTree';
import pageParserOptions from '../src/platform-implementation-js/dom-driver/inbox/pageParserOptions';
import parser from '../src/platform-implementation-js/dom-driver/inbox/detection/thread/parser';

function finder(documentElement: HTMLHtmlElement) {
  return pageParserOptions.finders.thread.fn(documentElement);
}

import {
  page20160614,
  pageFullscreen20160620,
  page20160727,
  page20160823,
  page20170317,
} from '../test/lib/pages';

describe('Inbox Thread Detection', () => {
  describe('finder', () => {
    it('2016-06-14', () => {
      const thread = querySelector(page20160614(), '[data-test-id=openthread]');

      const results = finder(page20160614());
      expect(results.length).toBe(1);
      expect(results).toContain(thread);
    });

    it('2016-06-20 fullscreen and bundled inline', () => {
      const thread = querySelector(pageFullscreen20160620(), '[data-test-id=openthread]');

      const results = finder(pageFullscreen20160620());
      expect(results.length).toBe(1);
      expect(results).toContain(thread);
    });

    it('2016-07-27 search', () => {
      const thread = querySelector(page20160727(), '[data-test-id=openthread]');

      const results = finder(page20160727());
      expect(results.length).toBe(1);
      expect(results).toContain(thread);
    });

    it('2016-08-23 thread in bundle', () => {
      const thread = querySelector(page20160823(), '[data-test-id=openthread]');

      const results = finder(page20160823());
      expect(results.length).toBe(1);
      expect(results).toContain(thread);
    });

    it('2017-03-17 thread', () => {
      const thread = querySelector(page20170317(), '[data-test-id=thread]');

      const results = finder(page20170317());
      expect(results.length).toBe(1);
      expect(results).toContain(thread);
    });
  });

  describe('parser', () => {
    it('2016-06-14 inline', () => {
      const thread = querySelector(page20160614(), '[data-test-id=openthread]');
      const results = parser(thread);
      expect(results.errors).toEqual([]);
      expect(results.score).toBe(1);
      expect(results.attributes.inBundle).toBe(false);
      expect(results.attributes.inboxThreadId).toBe('thread-f:1512997563584199246');
    });

    it('2016-06-20 bundled inline', () => {
      const thread = querySelector(pageFullscreen20160620(), '[data-test-id=openthread]');
      const results = parser(thread);
      expect(results.errors).toEqual([]);
      expect(results.score).toBe(1);
      expect(results.attributes.inBundle).toBe(true);
      expect(results.attributes.inboxThreadId).toBe('thread-f:1513306953051471524');
    });

    it('2016-07-27 search', () => {
      const thread = querySelector(page20160727(), '[data-test-id=openthread]');
      const results = parser(thread);
      expect(results.errors).toEqual([]);
      expect(results.score).toBe(1);
      expect(results.attributes.inBundle).toBe(false);
      expect(results.attributes.inboxThreadId).toBe('thread-f:1513627950174214078');
    });

    it('2016-08-23 thread in bundle', () => {
      const thread = querySelector(page20160823(), '[data-test-id=openthread]');
      const results = parser(thread);
      expect(results.errors).toEqual([]);
      expect(results.score).toBe(1);
      expect(results.attributes.inBundle).toBe(true);
      expect(results.attributes.inboxThreadId).toBe('thread-f:1543480514786604144');
    });

    it('2017-03-17 thread', () => {
      const thread = querySelector(page20170317(), '[data-test-id=thread]');
      const results = parser(thread);
      expect(results.errors).toEqual([]);
      expect(results.score).toBe(1);
      expect(results.attributes.inBundle).toBe(false);
      expect(results.attributes.inboxThreadId).toBe('thread-f:1562058394397337503');
    });
  });

  describe('watcher', () => {
    it('2016-06-14', () => {
      const thread = querySelector(page20160614(), '[data-test-id=openthread]');

      const root = page20160614();
      const liveSet = makePageParserTree(null, root).tree.getAllByTag('thread');
      expect(liveSet.values().size).toBe(1);
      expect(lsMap(liveSet, x => x.getValue()).values().has(thread)).toBe(true);
    });

    it('2016-06-20 fullscreen and bundled inline', () => {
      const thread = querySelector(pageFullscreen20160620(), '[data-test-id=openthread]');

      const root = pageFullscreen20160620();
      const liveSet = makePageParserTree(null, root).tree.getAllByTag('thread');
      expect(liveSet.values().size).toBe(1);
      expect(lsMap(liveSet, x => x.getValue()).values().has(thread)).toBe(true);
    });

    it('2016-07-27 search', () => {
      const thread = querySelector(page20160727(), '[data-test-id=openthread]');

      const root = page20160727();
      const liveSet = makePageParserTree(null, root).tree.getAllByTag('thread');
      expect(liveSet.values().size).toBe(1);
      expect(lsMap(liveSet, x => x.getValue()).values().has(thread)).toBe(true);
    });

    it('2016-08-23 thread in bundle', () => {
      const thread = querySelector(page20160823(), '[data-test-id=openthread]');

      const root = page20160823();
      const liveSet = makePageParserTree(null, root).tree.getAllByTag('thread');
      expect(liveSet.values().size).toBe(1);
      expect(lsMap(liveSet, x => x.getValue()).values().has(thread)).toBe(true);
    });

    it('2017-03-17 thread', () => {
      const thread = querySelector(page20170317(), '[data-test-id=thread]');

      const root = page20170317();
      const liveSet = makePageParserTree(null, root).tree.getAllByTag('thread');
      expect(liveSet.values().size).toBe(1);
      expect(lsMap(liveSet, x => x.getValue()).values().has(thread)).toBe(true);
    });
  });
});
