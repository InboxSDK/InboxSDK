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

import parser from '../src/platform-implementation-js/dom-driver/inbox/detection/compose/parser';

function inlineFinder(document) {
  const {documentElement} = document;
  if (!documentElement) throw new Error();
  return Array.from(pageParserOptions.finders.inlineCompose.fn(documentElement));
}
function regularFinder(document) {
  const {documentElement} = document;
  if (!documentElement) throw new Error();
  return Array.from(pageParserOptions.finders.regularCompose.fn(documentElement));
}
function fullscreenFinder(document) {
  const {documentElement} = document;
  if (!documentElement) throw new Error();
  return Array.from(pageParserOptions.finders.fullscreenCompose.fn(documentElement));
}
function finder(document) {
  return inlineFinder(document).concat(regularFinder(document), fullscreenFinder(document));
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
} from './lib/pages-old';

describe('Inbox Compose Detection', function() {
  this.slow(5000);
  this.timeout(10000);

  fakePageGlobals();

  describe('finder', function() {
    it('2016-06-14', function() {
      const compose1 = querySelector(page20160614(), '[data-test-id=compose1]');
      const compose2 = querySelector(page20160614(), '[data-test-id=compose2]');
      const inlineCompose = querySelector(page20160614(), '[data-test-id=inlinecompose]');

      const results = finder(page20160614());
      assert.strictEqual(results.length, 3);
      assert(_.includes(results, compose1));
      assert(_.includes(results, compose2));
      assert(_.includes(results, inlineCompose));
    });

    it('2016-06-14 with chat sidebar', function() {
      const compose1 = querySelector(pageWithSidebar20160614(), '[data-test-id=compose1]');

      const results = finder(pageWithSidebar20160614());
      assert.strictEqual(results.length, 1);
      assert(_.includes(results, compose1));
    });

    it('2016-06-20 fullscreen and bundled inline', function() {
      const bundledInlineCompose = querySelector(pageFullscreen20160620(), '[data-test-id=bundledInlineCompose]');
      const fullscreenCompose = querySelector(pageFullscreen20160620(), '[data-test-id=fullscreenCompose]');

      const results = finder(pageFullscreen20160620());
      assert.strictEqual(results.length, 2);
      assert(_.includes(results, bundledInlineCompose));
      assert(_.includes(results, fullscreenCompose));
    });

    it('2016-06-28', function() {
      const compose = querySelector(page20160628(), '[data-test-id=compose]');

      const results = finder(page20160628());
      assert.strictEqual(results.length, 1);
      assert(_.includes(results, compose));
    });

    it('2016-06-28-2', function() {
      const compose = querySelector(page20160628_2(), '[data-test-id=compose]');

      const results = finder(page20160628_2());
      assert.strictEqual(results.length, 1);
      assert(_.includes(results, compose));
    });

    it('2016-08-18', function() {
      const compose = querySelector(page20160818(), '[data-test-id=compose]');

      const results = finder(page20160818());
      assert.strictEqual(results.length, 1);
      assert(results.includes(compose));
    });

    it('2016-11-02 inline compose', function() {
      const compose = querySelector(page20161102(), '[data-test-id=compose]');

      const results = finder(page20161102());
      assert.strictEqual(results.length, 1);
      assert(results.includes(compose));
    });

    it('2017-03-02 inline compose', function() {
      const compose = querySelector(page20170302(), '[data-test-id=compose]');

      const results = finder(page20170302());
      assert.strictEqual(results.length, 1);
      assert(results.includes(compose));
    });
  });

  describe('parser', function() {
    it('2016-06-14', function() {
      const compose = querySelector(page20160614(), '[data-test-id=compose1]');
      const results = parser(compose);
      assert.deepEqual(results.errors, []);
      assert.strictEqual(results.score, 1);
      assert(!results.attributes.isInline);
    });

    it('2016-06-14 inline', function() {
      const compose = querySelector(page20160614(), '[data-test-id=inlinecompose]');
      const results = parser(compose);
      assert.deepEqual(results.errors, []);
      assert.strictEqual(results.score, 1);
      assert(results.attributes.isInline);
    });

    it('2016-06-20 fullscreen', function() {
      const fullscreenCompose = querySelector(pageFullscreen20160620(), '[data-test-id=fullscreenCompose]');
      const results = parser(fullscreenCompose);
      assert.deepEqual(results.errors, []);
      assert.strictEqual(results.score, 1);
      assert(!results.attributes.isInline);
    });

    it('2016-06-20 bundled inline', function() {
      const bundledInlineCompose = querySelector(pageFullscreen20160620(), '[data-test-id=bundledInlineCompose]');
      const results = parser(bundledInlineCompose);
      assert.deepEqual(results.errors, []);
      assert.strictEqual(results.score, 1);
      assert(results.attributes.isInline);
    });

    it('2016-06-28', function() {
      const compose = querySelector(page20160628(), '[data-test-id=compose]');
      const results = parser(compose);
      assert.deepEqual(results.errors, []);
      assert.strictEqual(results.score, 1);
      assert(results.attributes.isInline);
    });

    it('2016-06-28-2', function() {
      const compose = querySelector(page20160628_2(), '[data-test-id=compose]');
      const results = parser(compose);
      assert.deepEqual(results.errors, []);
      assert.strictEqual(results.score, 1);
      assert(!results.attributes.isInline);
    });

    it('2016-06-29', function() {
      const compose = querySelector(page20160629(), '[data-test-id=compose]');
      const results = parser(compose);
      assert.deepEqual(results.errors, []);
      assert.strictEqual(results.score, 1);
      assert(!results.attributes.isInline);
    });

    it('2016-06-29-2', function() {
      const compose = querySelector(page20160629_2(), '[data-test-id=compose]');
      const results = parser(compose);
      assert.deepEqual(results.errors, []);
      assert.strictEqual(results.score, 1);
      assert(results.attributes.isInline);
    });

    it('2016-06-29-3', function() {
      const compose = querySelector(page20160629_3(), '[data-test-id=compose]');
      const results = parser(compose);
      assert.deepEqual(results.errors, []);
      assert.strictEqual(results.score, 1);
      assert(results.attributes.isInline);
    });

    it('2016-08-18', function() {
      const compose = querySelector(page20160818(), '[data-test-id=compose]');
      const results = parser(compose);
      assert.deepEqual(results.errors, []);
      assert.strictEqual(results.score, 1);
      assert(results.attributes.isInline);
    });

    it('2016-11-02 inline compose', function() {
      const compose = querySelector(page20161102(), '[data-test-id=compose]');
      const results = parser(compose);
      assert.deepEqual(results.errors, []);
      assert.strictEqual(results.score, 1);
      assert(results.attributes.isInline);
    });
  });

  describe('watcher', function() {
    it('2016-06-14', function() {
      const compose1 = querySelector(page20160614(), '[data-test-id=compose1]');
      const compose2 = querySelector(page20160614(), '[data-test-id=compose2]');
      const inlineCompose = querySelector(page20160614(), '[data-test-id=inlinecompose]');

      const spy = sinon.spy();
      const root = page20160614();
      const tree = makePageParserTree(null, root).tree;

      assert.strictEqual(tree.getAllByTag('regularCompose').values().size, 2);
      assert(lsMap(tree.getAllByTag('regularCompose'), x => x.getValue()).values().has(compose1));
      assert(lsMap(tree.getAllByTag('regularCompose'), x => x.getValue()).values().has(compose2));

      assert.strictEqual(tree.getAllByTag('inlineCompose').values().size, 1);
      assert(lsMap(tree.getAllByTag('inlineCompose'), x => x.getValue()).values().has(inlineCompose));

      assert.strictEqual(tree.getAllByTag('fullscreenCompose').values().size, 0);
    });

    it('2016-06-14 with chat sidebar', function() {
      const compose1 = querySelector(pageWithSidebar20160614(), '[data-test-id=compose1]');

      const spy = sinon.spy();
      const root = pageWithSidebar20160614();
      const tree = makePageParserTree(null, root).tree;

      assert.strictEqual(tree.getAllByTag('regularCompose').values().size, 1);
      assert(lsMap(tree.getAllByTag('regularCompose'), x => x.getValue()).values().has(compose1));

      assert.strictEqual(tree.getAllByTag('inlineCompose').values().size, 0);

      assert.strictEqual(tree.getAllByTag('fullscreenCompose').values().size, 0);
    });

    it('2016-06-20 fullscreen and bundled inline', function() {
      const bundledInlineCompose = querySelector(pageFullscreen20160620(), '[data-test-id=bundledInlineCompose]');
      const fullscreenCompose = querySelector(pageFullscreen20160620(), '[data-test-id=fullscreenCompose]');

      const spy = sinon.spy();
      const root = pageFullscreen20160620();
      const tree = makePageParserTree(null, root).tree;

      assert.strictEqual(tree.getAllByTag('regularCompose').values().size, 0);

      assert.strictEqual(tree.getAllByTag('inlineCompose').values().size, 1);
      assert(lsMap(tree.getAllByTag('inlineCompose'), x => x.getValue()).values().has(bundledInlineCompose));

      assert.strictEqual(tree.getAllByTag('fullscreenCompose').values().size, 1);
      assert(lsMap(tree.getAllByTag('fullscreenCompose'), x => x.getValue()).values().has(fullscreenCompose));
    });

    it('2016-06-28 inline compose in search page', function() {
      const compose = querySelector(page20160628(), '[data-test-id=compose]');

      const spy = sinon.spy();
      const root = page20160628();
      const tree = makePageParserTree(null, root).tree;

      assert.strictEqual(tree.getAllByTag('regularCompose').values().size, 0);

      assert.strictEqual(tree.getAllByTag('inlineCompose').values().size, 1);
      assert(lsMap(tree.getAllByTag('inlineCompose'), x => x.getValue()).values().has(compose));

      assert.strictEqual(tree.getAllByTag('fullscreenCompose').values().size, 0);
    });

    it('2016-06-28-2 regular compose', function() {
      const compose = querySelector(page20160628_2(), '[data-test-id=compose]');

      const spy = sinon.spy();
      const root = page20160628_2();
      const tree = makePageParserTree(null, root).tree;

      assert.strictEqual(tree.getAllByTag('regularCompose').values().size, 1);
      assert(lsMap(tree.getAllByTag('regularCompose'), x => x.getValue()).values().has(compose));

      assert.strictEqual(tree.getAllByTag('inlineCompose').values().size, 0);

      assert.strictEqual(tree.getAllByTag('fullscreenCompose').values().size, 0);
    });

    it('2016-08-18 inline compose', function() {
      const compose = querySelector(page20160818(), '[data-test-id=compose]');

      const spy = sinon.spy();
      const root = page20160818();
      const tree = makePageParserTree(null, root).tree;

      assert.strictEqual(tree.getAllByTag('regularCompose').values().size, 0);

      assert.strictEqual(tree.getAllByTag('inlineCompose').values().size, 1);
      assert(lsMap(tree.getAllByTag('inlineCompose'), x => x.getValue()).values().has(compose));

      assert.strictEqual(tree.getAllByTag('fullscreenCompose').values().size, 0);
    });

    it('2016-11-02 inline compose', function() {
      const compose = querySelector(page20161102(), '[data-test-id=compose]');

      const spy = sinon.spy();
      const root = page20161102();
      const tree = makePageParserTree(null, root).tree;

      assert.strictEqual(tree.getAllByTag('regularCompose').values().size, 0);

      assert.strictEqual(tree.getAllByTag('inlineCompose').values().size, 1);
      assert(lsMap(tree.getAllByTag('inlineCompose'), x => x.getValue()).values().has(compose));

      assert.strictEqual(tree.getAllByTag('fullscreenCompose').values().size, 0);
    });
  });
});
