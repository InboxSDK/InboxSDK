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
import parser from '../../src/platform-implementation-js/dom-driver/inbox/detection/attachmentCard/parser';

function finder(documentElement: HTMLHtmlElement) {
  return Array.from(pageParserOptions.finders.attachmentCard.fn(documentElement));
}

import {
  page20160810_2,
  page20160812,
  page20160816,
  page20160908,
} from '../lib/pages';

describe('Inbox Attachment Card Detection', () => {
  describe('finder', () => {
    it('2016-08-10 message with attachments', () => {
      const attachment1 = querySelector(page20160810_2(), '[data-test-id=attachment1]');
      const attachment2 = querySelector(page20160810_2(), '[data-test-id=attachment2]');
      const attachment3 = querySelector(page20160810_2(), '[data-test-id=attachment3]');
      const attachment4 = querySelector(page20160810_2(), '[data-test-id=attachment4]');
      const attachment5 = querySelector(page20160810_2(), '[data-test-id=attachment5]');

      const results = finder(page20160810_2());
      expect(results.length).toBe(5);
      expect(results).toContain(attachment1);
      expect(results).toContain(attachment2);
      expect(results).toContain(attachment3);
      expect(results).toContain(attachment4);
      expect(results).toContain(attachment5);
    });

    // TODO re-enable when https://github.com/jsdom/jsdom/issues/2403 is fixed.
    xit('2016-08-12 list with card', () => {
      const attachment1 = querySelector(page20160812(), '[data-test-id=attachment1]');
      const results = finder(page20160812());
      expect(results.length).toBe(1);
      expect(results).toContain(attachment1);
    });

    it('2016-08-16 message with attachment', () => {
      const attachment1 = querySelector(page20160816(), '[data-test-id=attachment1]');
      const results = finder(page20160816());
      expect(results.length).toBe(1);
      expect(results).toContain(attachment1);
    });

    // TODO re-enable when https://github.com/jsdom/jsdom/issues/2403 is fixed.
    xit('2016-09-08 card in bundle', () => {
      const attachment1 = querySelector(page20160908(), '[data-test-id=attachment1]');
      const results = finder(page20160908());
      expect(results.length).toBe(1);
      expect(results).toContain(attachment1);
    });
  });

  describe('parser', () => {
    it('2016-08-10 message with attachments', () => {
      {
        const results = parser(querySelector(page20160810_2(), '[data-test-id=attachment1]'));
        expect(results.errors).toEqual([]);
        expect(results.score).toBe(1);
      }
      {
        const results = parser(querySelector(page20160810_2(), '[data-test-id=attachment2]'));
        expect(results.errors).toEqual([]);
        expect(results.score).toBe(1);
      }
      {
        const results = parser(querySelector(page20160810_2(), '[data-test-id=attachment3]'));
        expect(results.errors).toEqual([]);
        expect(results.score).toBe(1);
      }
      {
        const results = parser(querySelector(page20160810_2(), '[data-test-id=attachment4]'));
        expect(results.errors).toEqual([]);
        expect(results.score).toBe(1);
      }
      {
        const results = parser(querySelector(page20160810_2(), '[data-test-id=attachment5]'));
        expect(results.errors).toEqual([]);
        expect(results.score).toBe(1);
      }
    });

    it('2016-08-12 list with card', () => {
      const results = parser(querySelector(page20160812(), '[data-test-id=attachment1]'));
      expect(results.errors).toEqual([]);
      expect(results.score).toBe(1);
    });

    it('2016-08-16 message with attachment', () => {
      const results = parser(querySelector(page20160816(), '[data-test-id=attachment1]'));
      expect(results.errors).toEqual([]);
      expect(results.score).toBe(1);
    });

    it('2016-09-08 card in bundle', () => {
      const results = parser(querySelector(page20160908(), '[data-test-id=attachment1]'));
      expect(results.errors).toEqual([]);
      expect(results.score).toBe(1);
    });
  });

  describe('watcher', () => {
    it('2016-08-10 message with attachments', () => {
      const attachment1 = querySelector(page20160810_2(), '[data-test-id=attachment1]');
      const attachment2 = querySelector(page20160810_2(), '[data-test-id=attachment2]');
      const attachment3 = querySelector(page20160810_2(), '[data-test-id=attachment3]');
      const attachment4 = querySelector(page20160810_2(), '[data-test-id=attachment4]');
      const attachment5 = querySelector(page20160810_2(), '[data-test-id=attachment5]');

      const spy = sinon.spy();
      const root = page20160810_2();
      const liveSet = makePageParserTree(null, root).tree.getAllByTag('attachmentCard');
      expect(liveSet.values().size).toBe(5);
      const elements = lsMap(liveSet, x => x.getValue());
      expect(elements.values().has(attachment1)).toBe(true);
      expect(elements.values().has(attachment2)).toBe(true);
      expect(elements.values().has(attachment3)).toBe(true);
      expect(elements.values().has(attachment4)).toBe(true);
      expect(elements.values().has(attachment5)).toBe(true);
    });

    it('2016-08-12 list with card', () => {
      const attachment1 = querySelector(page20160812(), '[data-test-id=attachment1]');

      const spy = sinon.spy();
      const root = page20160812();
      const liveSet = makePageParserTree(null, root).tree.getAllByTag('attachmentCard');
      expect(liveSet.values().size).toBe(1);
      const elements = lsMap(liveSet, x => x.getValue());
      expect(elements.values().has(attachment1)).toBe(true);
    });

    it('2016-08-16 message with attachment', () => {
      const attachment1 = querySelector(page20160816(), '[data-test-id=attachment1]');

      const spy = sinon.spy();
      const root = page20160816();
      const liveSet = makePageParserTree(null, root).tree.getAllByTag('attachmentCard');
      expect(liveSet.values().size).toBe(1);
      const elements = lsMap(liveSet, x => x.getValue());
      expect(elements.values().has(attachment1)).toBe(true);
    });

    it('2016-09-08 card in bundle', () => {
      const attachment1 = querySelector(page20160908(), '[data-test-id=attachment1]');

      const spy = sinon.spy();
      const root = page20160908();
      const liveSet = makePageParserTree(null, root).tree.getAllByTag('attachmentCard');
      expect(liveSet.values().size).toBe(1);
      const elements = lsMap(liveSet, x => x.getValue());
      expect(elements.values().has(attachment1)).toBe(true);
    });
  });
});
