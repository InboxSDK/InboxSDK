/* @flow */

import lsMap from 'live-set/map';
import querySelector from '../../src/platform-implementation-js/lib/dom/querySelectorOrFail';
import MockMutationObserver from '../lib/mock-mutation-observer';
global.MutationObserver = MockMutationObserver;

import makePageParserTree from '../lib/makePageParserTree';
import pageParserOptions from '../../src/platform-implementation-js/dom-driver/inbox/pageParserOptions';
import parser from '../../src/platform-implementation-js/dom-driver/inbox/detection/searchBar/parser';

function searchBarFinder(documentElement: HTMLHtmlElement) {
  return Array.from(pageParserOptions.finders.searchBar.fn(documentElement));
}

function searchAutocompleteResultsFinder(documentElement: HTMLHtmlElement) {
  return Array.from(pageParserOptions.finders.searchAutocompleteResults.fn(documentElement));
}

import {
  page20160614,
  pageWithSidebar20160614,
  pageWithNav20170303,
  pageWithAutocomplete20170306
} from '../lib/pages';

describe('Inbox Search Detection', () => {
  describe('Search Bar', () => {
    describe('finder', () => {
      it('2016-06-14', () => {
        const searchBar = page20160614().querySelector('[data-test-id="searchbar"]');
        const results = searchBarFinder(page20160614());
        expect(results).toEqual([searchBar]);
      });

      it('2016-06-14 with chat sidebar', () => {
        const searchBar = pageWithSidebar20160614().querySelector('[data-test-id="searchbar"]');
        const results = searchBarFinder(pageWithSidebar20160614());
        expect(results).toEqual([searchBar]);
      });
    });

    describe('parser', () => {
      it('2017-03-03', () => {
        const searchBar = querySelector(pageWithNav20170303(), '[data-test-id="searchInput"]');
        const results = parser(searchBar);
        expect(results.errors).toEqual([]);
        expect(results.score).toBe(1);
      });
    });
  });

  describe('Search Autocomplete', () => {
    describe('finder', () => {
      it('2017-03-06', () => {
        const searchBar = pageWithAutocomplete20170306().querySelector('[data-test-id="searchAutocompleteResults"]');
        const results = searchAutocompleteResultsFinder(pageWithAutocomplete20170306());
        expect(results).toEqual([searchBar]);
      });
    });

    describe('watcher', () => {
      it('2016-08-23 thread in bundle', () => {
        const results = querySelector(pageWithAutocomplete20170306(), '[data-test-id=searchAutocompleteResults]');

        const root = pageWithAutocomplete20170306();
        const liveSet = makePageParserTree(null, root).tree.getAllByTag('searchAutocompleteResults');
        expect(liveSet.values().size).toBe(1);
        expect(lsMap(liveSet, x => x.getValue()).values().has(results)).toBe(true);
      });
    });
  });
});
