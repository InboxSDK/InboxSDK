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

import parser from '../../src/platform-implementation-js/dom-driver/inbox/detection/compose/parser';

function inlineFinder(documentElement: HTMLHtmlElement) {
  return Array.from(pageParserOptions.finders.inlineCompose.fn(documentElement));
}
function regularFinder(documentElement: HTMLHtmlElement) {
  return Array.from(pageParserOptions.finders.regularCompose.fn(documentElement));
}
function fullscreenFinder(documentElement: HTMLHtmlElement) {
  return Array.from(pageParserOptions.finders.fullscreenCompose.fn(documentElement));
}
function finder(documentElement: HTMLHtmlElement) {
  return [
    ...inlineFinder(documentElement),
    ...regularFinder(documentElement),
    ...fullscreenFinder(documentElement)
  ];
}

import {
  page20160614,
  pageWithSidebar20160614,
  pageFullscreen20160620,
  page20160628,
  page20160628_2,
  page20160629,
  page20160629_2,
  page20160629_3,
  page20160818,
  page20161102,
  page20170302,
} from '../lib/pages';

describe('Inbox Compose Detection', () => {
  describe('finder', () => {
    it('2016-06-14', () => {
      const compose1 = querySelector(page20160614(), '[data-test-id=compose1]');
      const compose2 = querySelector(page20160614(), '[data-test-id=compose2]');
      const inlineCompose = querySelector(page20160614(), '[data-test-id=inlinecompose]');

      const results = finder(page20160614());
      expect(results.length).toBe(3);
      expect(results).toContain(compose1);
      expect(results).toContain(compose2);
      expect(results).toContain(inlineCompose);
    });

    it('2016-06-14 with chat sidebar', () => {
      const compose1 = querySelector(pageWithSidebar20160614(), '[data-test-id=compose1]');

      const results = finder(pageWithSidebar20160614());
      expect(results.length).toBe(1);
      expect(results).toContain(compose1);
    });

    it('2016-06-20 fullscreen and bundled inline', () => {
      const bundledInlineCompose = querySelector(pageFullscreen20160620(), '[data-test-id=bundledInlineCompose]');
      const fullscreenCompose = querySelector(pageFullscreen20160620(), '[data-test-id=fullscreenCompose]');

      const results = finder(pageFullscreen20160620());
      expect(results.length).toBe(2);
      expect(results).toContain(bundledInlineCompose);
      expect(results).toContain(fullscreenCompose);
    });

    it('2016-06-28', () => {
      const compose = querySelector(page20160628(), '[data-test-id=compose]');

      const results = finder(page20160628());
      expect(results.length).toBe(1);
      expect(results).toContain(compose);
    });

    it('2016-06-28-2', () => {
      const compose = querySelector(page20160628_2(), '[data-test-id=compose]');

      const results = finder(page20160628_2());
      expect(results.length).toBe(1);
      expect(results).toContain(compose);
    });

    it('2016-08-18', () => {
      const compose = querySelector(page20160818(), '[data-test-id=compose]');

      const results = finder(page20160818());
      expect(results.length).toBe(1);
      expect(results).toContain(compose);
    });

    it('2016-11-02 inline compose', () => {
      const compose = querySelector(page20161102(), '[data-test-id=compose]');

      const results = finder(page20161102());
      expect(results.length).toBe(1);
      expect(results).toContain(compose);
    });

    it('2017-03-02 inline compose', () => {
      const compose = querySelector(page20170302(), '[data-test-id=compose]');

      const results = finder(page20170302());
      expect(results.length).toBe(1);
      expect(results).toContain(compose);
    });
  });

  describe('parser', () => {
    it('2016-06-14', () => {
      const compose = querySelector(page20160614(), '[data-test-id=compose1]');
      const results = parser(compose);
      expect(results.errors).toEqual([]);
      expect(results.score).toBe(1);
      expect(results.attributes.isInline).toBe(false);
    });

    it('2016-06-14 inline', () => {
      const compose = querySelector(page20160614(), '[data-test-id=inlinecompose]');
      const results = parser(compose);
      expect(results.errors).toEqual([]);
      expect(results.score).toBe(1);
      expect(results.attributes.isInline).toBe(true);
    });

    it('2016-06-20 fullscreen', () => {
      const fullscreenCompose = querySelector(pageFullscreen20160620(), '[data-test-id=fullscreenCompose]');
      const results = parser(fullscreenCompose);
      expect(results.errors).toEqual([]);
      expect(results.score).toBe(1);
      expect(results.attributes.isInline).toBe(false);
    });

    it('2016-06-20 bundled inline', () => {
      const bundledInlineCompose = querySelector(pageFullscreen20160620(), '[data-test-id=bundledInlineCompose]');
      const results = parser(bundledInlineCompose);
      expect(results.errors).toEqual([]);
      expect(results.score).toBe(1);
      expect(results.attributes.isInline).toBe(true);
    });

    it('2016-06-28', () => {
      const compose = querySelector(page20160628(), '[data-test-id=compose]');
      const results = parser(compose);
      expect(results.errors).toEqual([]);
      expect(results.score).toBe(1);
      expect(results.attributes.isInline).toBe(true);
    });

    it('2016-06-28-2', () => {
      const compose = querySelector(page20160628_2(), '[data-test-id=compose]');
      const results = parser(compose);
      expect(results.errors).toEqual([]);
      expect(results.score).toBe(1);
      expect(results.attributes.isInline).toBe(false);
    });

    it('2016-06-29', () => {
      const compose = querySelector(page20160629(), '[data-test-id=compose]');
      const results = parser(compose);
      expect(results.errors).toEqual([]);
      expect(results.score).toBe(1);
      expect(results.attributes.isInline).toBe(false);
    });

    it('2016-06-29-2', () => {
      const compose = querySelector(page20160629_2(), '[data-test-id=compose]');
      const results = parser(compose);
      expect(results.errors).toEqual([]);
      expect(results.score).toBe(1);
      expect(results.attributes.isInline).toBe(true);
    });

    it('2016-06-29-3', () => {
      const compose = querySelector(page20160629_3(), '[data-test-id=compose]');
      const results = parser(compose);
      expect(results.errors).toEqual([]);
      expect(results.score).toBe(1);
      expect(results.attributes.isInline).toBe(true);
    });

    it('2016-08-18', () => {
      const compose = querySelector(page20160818(), '[data-test-id=compose]');
      const results = parser(compose);
      expect(results.errors).toEqual([]);
      expect(results.score).toBe(1);
      expect(results.attributes.isInline).toBe(true);
    });

    it('2016-11-02 inline compose', () => {
      const compose = querySelector(page20161102(), '[data-test-id=compose]');
      const results = parser(compose);
      expect(results.errors).toEqual([]);
      expect(results.score).toBe(1);
      expect(results.attributes.isInline).toBe(true);
    });
  });

  describe('watcher', () => {
    it('2016-06-14', async () => {
      const compose1 = querySelector(page20160614(), '[data-test-id=compose1]');
      const compose2 = querySelector(page20160614(), '[data-test-id=compose2]');
      const inlineCompose = querySelector(page20160614(), '[data-test-id=inlinecompose]');

      const spy = sinon.spy();
      const root = page20160614();
      const tree = makePageParserTree(null, root).tree;

      expect(tree.getAllByTag('regularCompose').values().size).toBe(2);
      expect(lsMap(tree.getAllByTag('regularCompose'), x => x.getValue()).values().has(compose1)).toBe(true);
      expect(lsMap(tree.getAllByTag('regularCompose'), x => x.getValue()).values().has(compose2)).toBe(true);

      expect(tree.getAllByTag('inlineCompose').values().size).toBe(1);
      expect(lsMap(tree.getAllByTag('inlineCompose'), x => x.getValue()).values().has(inlineCompose)).toBe(true);

      expect(tree.getAllByTag('fullscreenCompose').values().size).toBe(0);
    });

    it('2016-06-14 with chat sidebar', () => {
      const compose1 = querySelector(pageWithSidebar20160614(), '[data-test-id=compose1]');

      const spy = sinon.spy();
      const root = pageWithSidebar20160614();
      const tree = makePageParserTree(null, root).tree;

      expect(tree.getAllByTag('regularCompose').values().size).toBe(1);
      expect(lsMap(tree.getAllByTag('regularCompose'), x => x.getValue()).values().has(compose1)).toBe(true);

      expect(tree.getAllByTag('inlineCompose').values().size).toBe(0);

      expect(tree.getAllByTag('fullscreenCompose').values().size).toBe(0);
    });

    it('2016-06-20 fullscreen and bundled inline', () => {
      const bundledInlineCompose = querySelector(pageFullscreen20160620(), '[data-test-id=bundledInlineCompose]');
      const fullscreenCompose = querySelector(pageFullscreen20160620(), '[data-test-id=fullscreenCompose]');

      const spy = sinon.spy();
      const root = pageFullscreen20160620();
      const tree = makePageParserTree(null, root).tree;

      expect(tree.getAllByTag('regularCompose').values().size).toBe(0);

      expect(tree.getAllByTag('inlineCompose').values().size).toBe(1);
      expect(lsMap(tree.getAllByTag('inlineCompose'), x => x.getValue()).values().has(bundledInlineCompose)).toBe(true);

      expect(tree.getAllByTag('fullscreenCompose').values().size).toBe(1);
      expect(lsMap(tree.getAllByTag('fullscreenCompose'), x => x.getValue()).values().has(fullscreenCompose)).toBe(true);
    });

    it('2016-06-28 inline compose in search page', () => {
      const compose = querySelector(page20160628(), '[data-test-id=compose]');

      const spy = sinon.spy();
      const root = page20160628();
      const tree = makePageParserTree(null, root).tree;

      expect(tree.getAllByTag('regularCompose').values().size).toBe(0);

      expect(tree.getAllByTag('inlineCompose').values().size).toBe(1);
      expect(lsMap(tree.getAllByTag('inlineCompose'), x => x.getValue()).values().has(compose)).toBe(true);

      expect(tree.getAllByTag('fullscreenCompose').values().size).toBe(0);
    });

    it('2016-06-28-2 regular compose', () => {
      const compose = querySelector(page20160628_2(), '[data-test-id=compose]');

      const spy = sinon.spy();
      const root = page20160628_2();
      const tree = makePageParserTree(null, root).tree;

      expect(tree.getAllByTag('regularCompose').values().size).toBe(1);
      expect(lsMap(tree.getAllByTag('regularCompose'), x => x.getValue()).values().has(compose)).toBe(true);

      expect(tree.getAllByTag('inlineCompose').values().size).toBe(0);

      expect(tree.getAllByTag('fullscreenCompose').values().size).toBe(0);
    });

    it('2016-08-18 inline compose', () => {
      const compose = querySelector(page20160818(), '[data-test-id=compose]');

      const spy = sinon.spy();
      const root = page20160818();
      const tree = makePageParserTree(null, root).tree;

      expect(tree.getAllByTag('regularCompose').values().size).toBe(0);

      expect(tree.getAllByTag('inlineCompose').values().size).toBe(1);
      expect(lsMap(tree.getAllByTag('inlineCompose'), x => x.getValue()).values().has(compose)).toBe(true);

      expect(tree.getAllByTag('fullscreenCompose').values().size).toBe(0);
    });

    it('2016-11-02 inline compose', () => {
      const compose = querySelector(page20161102(), '[data-test-id=compose]');

      const spy = sinon.spy();
      const root = page20161102();
      const tree = makePageParserTree(null, root).tree;

      expect(tree.getAllByTag('regularCompose').values().size).toBe(0);

      expect(tree.getAllByTag('inlineCompose').values().size).toBe(1);
      expect(lsMap(tree.getAllByTag('inlineCompose'), x => x.getValue()).values().has(compose)).toBe(true);

      expect(tree.getAllByTag('fullscreenCompose').values().size).toBe(0);
    });
  });
});
