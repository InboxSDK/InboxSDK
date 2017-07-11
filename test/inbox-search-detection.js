/* @flow */

import assert from 'assert';
import querySelector from '../src/platform-implementation-js/lib/dom/querySelectorOrFail';
import fakePageGlobals from './lib/fake-page-globals';
import pageParserOptions from '../src/platform-implementation-js/dom-driver/inbox/pageParserOptions';
import parser from '../src/platform-implementation-js/dom-driver/inbox/detection/searchBar/parser';
import makePageParserTree from './lib/makePageParserTree';
import lsMap from 'live-set/map';

function searchBarFinder(document) {
  const {documentElement} = document;
  if (!documentElement) throw new Error();
  return Array.from(pageParserOptions.finders.searchBar.fn(documentElement));
}

function searchAutocompleteResultsFinder(document) {
  const {documentElement} = document;
  if (!documentElement) throw new Error();
  return Array.from(pageParserOptions.finders.searchAutocompleteResults.fn(documentElement));
}

import {
  page20160614,
  pageWithSidebar20160614,
  pageWithNav20170303,
  pageWithAutocomplete20170306
} from './lib/pages';

describe('Inbox Search Detection', function() {
  this.slow(5000);
  this.timeout(10000);

  fakePageGlobals();

  describe('Search Bar', function() {
    describe('finder', function() {
      it('2016-06-14', function() {
        const searchBar = page20160614().querySelector('[data-test-id="apptoolbar-rightMargin"]');
        const results = searchBarFinder(page20160614());
        assert.deepEqual(results, [searchBar]);
      });

      it('2016-06-14 with chat sidebar', function() {
        const searchBar = pageWithSidebar20160614().querySelector('[data-test-id="apptoolbar-rightMargin"]');
        const results = searchBarFinder(pageWithSidebar20160614());
        assert.deepEqual(results, [searchBar]);
      });
    });

    describe('parser', function() {
      it('2017-03-03', function() {
        const searchBar = querySelector(pageWithNav20170303(), '[data-test-id="searchInput"]');
        const results = parser(searchBar);
        assert.deepEqual(results.errors, []);
        assert.strictEqual(results.score, 1);
      });
    });
  });

  describe('Search Autocomplete', function() {
    describe('finder', function() {
      it('2017-03-06', function() {
        const searchBar = pageWithAutocomplete20170306().querySelector('[data-test-id="searchAutocompleteResults"]');
        const results = searchAutocompleteResultsFinder(pageWithAutocomplete20170306());
        assert.deepEqual(results, [searchBar]);
      });
    });

    describe('watcher', function() {
      it('2016-08-23 thread in bundle', function() {
        const results = querySelector(pageWithAutocomplete20170306(), '[data-test-id=searchAutocompleteResults]');

        const root = pageWithAutocomplete20170306();
        const liveSet = makePageParserTree(null, root).tree.getAllByTag('searchAutocompleteResults');
        assert.strictEqual(liveSet.values().size, 1);
        assert(lsMap(liveSet, x => x.getValue()).values().has(results));
      });
    });
  });
});
