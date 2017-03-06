/* @flow */

import assert from 'assert';
import fakePageGlobals from './lib/fake-page-globals';
import pageParserOptions from '../src/platform-implementation-js/dom-driver/inbox/pageParserOptions';

function locFinder(document) {
  const {documentElement} = document;
  if (!documentElement) throw new Error();
  return Array.from(pageParserOptions.finders.appToolbarLocation.fn(documentElement));
}

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
});
