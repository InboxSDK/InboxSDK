/* @flow */

import _ from 'lodash';
import sinon from 'sinon';
import Kefir from 'kefir';
import lsMap from 'live-set/map';
import querySelector from '../../src/platform-implementation-js/lib/dom/querySelectorOrFail';
import MockMutationObserver from '../lib/mock-mutation-observer';
global.MutationObserver = MockMutationObserver;

import makePageParserTree from '../lib/makePageParserTree';
import pageParserOptions from '../../src/platform-implementation-js/dom-driver/inbox/pageParserOptions';
import parser from '../../src/platform-implementation-js/dom-driver/inbox/detection/attachmentOverlay/parser';

function finder(documentElement: HTMLHtmlElement) {
  return Array.from(pageParserOptions.finders.attachmentOverlay.fn(documentElement));
}

import {
  page20160816,
  page20160817,
  page20160830,
  page20170209,
} from '../lib/pages';

describe('Inbox Attachment Overlay Detection', () => {
  describe('finder', () => {
    it('2016-08-16 message with attachment', () => {
      const results = finder(page20160816());
      expect(results.length).toBe(0);
    });

    it('2016-08-17 with preview overlay', () => {
      const overlay = querySelector((querySelector(page20160817(), 'iframe#FfJ3bf'):any).contentDocument, '[data-test-id=overlay]');
      const results = finder(page20160817());
      expect(results.length).toBe(1);
      expect(results).toContain(overlay);
    });
  });

  describe('parser', () => {
    it('2016-08-17 with preview overlay', () => {
      const overlay = querySelector((querySelector(page20160817(), 'iframe#FfJ3bf'):any).contentDocument, '[data-test-id=overlay]');
      const results = parser(overlay);
      expect(results.errors).toEqual([]);
      expect(results.score).toBe(1);
    });

    it('2016-08-30', () => {
      const overlay = querySelector(page20160830(), '[data-test-id=overlay]');
      const results = parser(overlay);
      expect(results.errors).toEqual([]);
      expect(results.score).toBe(1);
      expect(results.elements.downloadButton).toBe(querySelector(page20160830(), '[data-test-id="downloadButton"]'));
    });

    it('2017-02-09', () => {
      const overlay = querySelector(page20170209(), '[data-test-id=overlay]');
      const results = parser(overlay);
      expect(results.errors).toEqual([]);
      expect(results.score).toBe(1);
      expect(results.elements.downloadButton).toBe(querySelector(page20170209(), '[data-test-id="downloadButton"]'));
    });
  });

  describe('watcher', () => {
    it('2016-08-16 message with attachment', () => {
      const spy = sinon.spy();
      const root = page20160816();
      const liveSet = makePageParserTree(null, root).tree.getAllByTag('attachmentOverlay');
      expect(liveSet.values().size).toBe(0);
    });

    it('2016-08-17 with preview overlay', () => {
      const overlay = querySelector((querySelector(page20160817(), 'iframe#FfJ3bf'):any).contentDocument, '[data-test-id=overlay]');
      const root = page20160817();
      const liveSet = makePageParserTree(null, root).tree.getAllByTag('attachmentOverlay');
      expect(liveSet.values().size).toBe(1);
      expect(lsMap(liveSet, x => x.getValue()).values().has(overlay)).toBe(true);
    });
  });
});
