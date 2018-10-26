/* @flow */

import pageParserOptions from '../../src/platform-implementation-js/dom-driver/inbox/pageParserOptions';

function locFinder(documentElement) {
  return Array.from(
    pageParserOptions.finders.appToolbarLocation.fn(documentElement)
  );
}

import { page20160614, pageWithSidebar20160614 } from '../lib/pages';

describe('Inbox AppToolbar Support Detection', () => {
  describe('location', () => {
    describe('finder', () => {
      it('2016-06-14', () => {
        const location = page20160614().querySelector(
          '[data-test-id="apptoolbar-location"]'
        );
        const results = locFinder(page20160614());
        expect(results).toEqual([location]);
      });

      it('2016-06-14 with chat sidebar', () => {
        const location = pageWithSidebar20160614().querySelector(
          '[data-test-id="apptoolbar-location"]'
        );
        const results = locFinder(pageWithSidebar20160614());
        expect(results).toEqual([location]);
      });
    });
  });
});
