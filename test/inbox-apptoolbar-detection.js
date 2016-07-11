/* @flow */

import _ from 'lodash';
import fs from 'fs';
import assert from 'assert';
import sinon from 'sinon';
import Kefir from 'kefir';
import once from 'lodash/function/once';
import jsdomDoc from './lib/jsdom-doc';
import fakePageGlobals from './lib/fake-page-globals';

import locFinder from '../src/platform-implementation-js/dom-driver/inbox/detection/appToolbarLocation/finder';
import searchBarFinder from '../src/platform-implementation-js/dom-driver/inbox/detection/searchBar/finder';

import {
  page20160614,
  pageWithSidebar20160614
} from './lib/pages';

describe('Inbox AppToolbar Support Detection', function() {
  this.slow(5000);
  this.timeout(10000);

  fakePageGlobals();

  describe('location', function() {
    describe('finder', function() {
      it('2016-06-14', function() {
        const location = page20160614().querySelector('[data-test-id="apptoolbar-location"]');
        const results = locFinder(page20160614());
        assert.deepEqual(results, [location]);
      });

      it('2016-06-14 with chat sidebar', function() {
        const location = pageWithSidebar20160614().querySelector('[data-test-id="apptoolbar-location"]');
        const results = locFinder(pageWithSidebar20160614());
        assert.deepEqual(results, [location]);
      });
    });
  });

  describe('search bar', function() {
    describe('finder', function() {
      it('2016-06-14', function() {
        const rightMargin = page20160614().querySelector('[data-test-id="apptoolbar-rightMargin"]');
        const results = searchBarFinder(page20160614());
        assert.deepEqual(results, [rightMargin]);
      });

      it('2016-06-14 with chat sidebar', function() {
        const rightMargin = pageWithSidebar20160614().querySelector('[data-test-id="apptoolbar-rightMargin"]');
        const results = searchBarFinder(pageWithSidebar20160614());
        assert.deepEqual(results, [rightMargin]);
      });
    });
  });
});
