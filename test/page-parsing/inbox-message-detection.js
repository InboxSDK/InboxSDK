/* @flow */

import _ from 'lodash';
import fs from 'fs';
import sinon from 'sinon';
import Kefir from 'kefir';
import lsMap from 'live-set/map';
import querySelector from '../../src/platform-implementation-js/lib/dom/querySelectorOrFail';
import MockMutationObserver from '../lib/mock-mutation-observer';
global.MutationObserver = MockMutationObserver;

import makePageParserTree from '../lib/makePageParserTree';
import pageParserOptions from '../../src/platform-implementation-js/dom-driver/inbox/pageParserOptions';
import parser from '../../src/platform-implementation-js/dom-driver/inbox/detection/message/parser';

function finder(documentElement) {
  return pageParserOptions.finders.message.fn(documentElement);
}

import {
  page20160614,
  pageFullscreen20160620,
  page20160810,
  page20160810_2,
  page20160818_2,
  page20160819,
} from '../lib/pages';

describe('Inbox Message Detection', () => {
  describe('finder', () => {
    it('2016-06-14', () => {
      const message = querySelector(page20160614(), '[data-test-id=message]');

      const results = finder(page20160614());
      expect(results.length).toBe(1);
      expect(results).toContain(message);
    });

    it('2016-06-20 fullscreen and bundled inline', () => {
      const message = querySelector(pageFullscreen20160620(), '[data-test-id=message]');

      const results = finder(pageFullscreen20160620());
      expect(results.length).toBe(1);
      expect(results).toContain(message);
    });

    it('2016-08-10 message', () => {
      const message = querySelector(page20160810(), '[data-test-id=message]');

      const results = finder(page20160810());
      expect(results.length).toBe(1);
      expect(results).toContain(message);
    });

    it('2016-08-10 message with attachments', () => {
      const message = querySelector(page20160810_2(), '[data-test-id=message]');

      const results = finder(page20160810_2());
      expect(results.length).toBe(1);
      expect(results).toContain(message);
    });

    it('2016-08-18', () => {
      const message = querySelector(page20160818_2(), '[data-test-id=message]');

      const results = finder(page20160818_2());
      expect(results.length).toBe(1);
      expect(results).toContain(message);
    });

    it('2016-08-19 draft in thread', () => {
      const message = querySelector(page20160819(), '[data-test-id=message]');

      const results = finder(page20160819());
      expect(results.length).toBe(1);
      expect(results).toContain(message);
    });
  });

  describe('parser', () => {
    it('2016-06-14 inline', () => {
      const message = querySelector(page20160614(), '[data-test-id=message]');
      const results = parser(message);
      expect(results.errors).toEqual([]);
      expect(results.score).toBe(1);
      expect(results.attributes.loaded).toBe(true);
      expect(results.attributes.isDraft).toBe(false);
      expect(results.attributes.viewState).toBe('EXPANDED');
      expect(results.attributes.inboxMessageId).toBe('msg-f:1512997563584199246');
    });

    it('2016-06-20 bundled inline', () => {
      const message = querySelector(pageFullscreen20160620(), '[data-test-id=message]');
      const results = parser(message);
      expect(results.errors).toEqual([]);
      expect(results.score).toBe(1);
      expect(results.attributes.loaded).toBe(true);
      expect(results.attributes.isDraft).toBe(false);
      expect(results.attributes.viewState).toBe('EXPANDED');
      expect(results.attributes.inboxMessageId).toBe('msg-f:1513306953051471524');
    });

    it('2016-08-10 message', () => {
      const message = querySelector(page20160810(), '[data-test-id=message]');
      const results = parser(message);
      expect(results.errors).toEqual([]);
      expect(results.score).toBe(1);
      expect(results.attributes.loaded).toBe(true);
      expect(results.attributes.isDraft).toBe(false);
      expect(results.attributes.viewState).toBe('EXPANDED');
      expect(results.attributes.inboxMessageId).toBe('msg-f:1542295687109342844');
    });

    it('2016-08-10 message with attachments', () => {
      const message = querySelector(page20160810_2(), '[data-test-id=message]');
      const results = parser(message);
      expect(results.errors).toEqual([]);
      expect(results.score).toBe(1);
      expect(results.attributes.loaded).toBe(true);
      expect(results.attributes.isDraft).toBe(false);
      expect(results.attributes.viewState).toBe('EXPANDED');
      expect(results.attributes.inboxMessageId).toBe('msg-a:r7822902296672552911');
    });

    it('2016-08-18', () => {
      const message = querySelector(page20160818_2(), '[data-test-id=message]');
      const results = parser(message);
      expect(results.errors).toEqual([]);
      expect(results.score).toBe(1);
      expect(results.attributes.loaded).toBe(true);
      expect(results.attributes.isDraft).toBe(false);
      expect(results.attributes.viewState).toBe('EXPANDED');
      expect(results.attributes.inboxMessageId).toBe('msg-f:1542955973201340003');
    });

    it('2016-08-19 draft in thread', () => {
      const message = querySelector(page20160819(), '[data-test-id=message]');
      const results = parser(message);
      expect(results.errors).toEqual([]);
      expect(results.score).toBe(1);
      expect(results.attributes.isDraft).toBe(true);
      expect(results.attributes.inboxMessageId).toBe('msg-a:r-663027805731183423');
    });
  });

  describe('watcher', () => {
    it('2016-06-14', () => {
      const message = querySelector(page20160614(), '[data-test-id=message]');

      const spy = sinon.spy();
      const root = page20160614();
      const liveSet = makePageParserTree(null, root).tree.getAllByTag('message');
      expect(liveSet.values().size).toBe(1);
      expect(lsMap(liveSet, x => x.getValue()).values().has(message)).toBe(true);
    });

    it('2016-06-20 fullscreen and bundled inline', () => {
      const message = querySelector(pageFullscreen20160620(), '[data-test-id=message]');

      const spy = sinon.spy();
      const root = pageFullscreen20160620();
      const liveSet = makePageParserTree(null, root).tree.getAllByTag('message');
      expect(liveSet.values().size).toBe(1);
      expect(lsMap(liveSet, x => x.getValue()).values().has(message)).toBe(true);
    });

    it('2016-08-10 message', () => {
      const message = querySelector(page20160810(), '[data-test-id=message]');

      const spy = sinon.spy();
      const root = page20160810();
      const liveSet = makePageParserTree(null, root).tree.getAllByTag('message');
      expect(liveSet.values().size).toBe(1);
      expect(lsMap(liveSet, x => x.getValue()).values().has(message)).toBe(true);
    });

    it('2016-08-10 message with attachments', () => {
      const message = querySelector(page20160810_2(), '[data-test-id=message]');

      const spy = sinon.spy();
      const root = page20160810_2();
      const liveSet = makePageParserTree(null, root).tree.getAllByTag('message');
      expect(liveSet.values().size).toBe(1);
      expect(lsMap(liveSet, x => x.getValue()).values().has(message)).toBe(true);
    });

    it('2016-08-18', () => {
      const message = querySelector(page20160818_2(), '[data-test-id=message]');

      const spy = sinon.spy();
      const root = page20160818_2();
      const liveSet = makePageParserTree(null, root).tree.getAllByTag('message');
      expect(liveSet.values().size).toBe(1);
      expect(lsMap(liveSet, x => x.getValue()).values().has(message)).toBe(true);
    });

    it('2016-08-19 draft in thread', () => {
      const message = querySelector(page20160819(), '[data-test-id=message]');

      const spy = sinon.spy();
      const root = page20160819();
      const liveSet = makePageParserTree(null, root).tree.getAllByTag('message');
      expect(liveSet.values().size).toBe(1);
      expect(lsMap(liveSet, x => x.getValue()).values().has(message)).toBe(true);
    });
  });
});
