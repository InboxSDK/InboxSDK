/* @flow */

import SuggestionsResponseModifier from './SuggestionsResponseModifier';

test('works', () => {
  const s = new SuggestionsResponseModifier(JSON.stringify(require('./testdata/r2r-suggest.json')));
  expect(s.getWarningError()).toBe(undefined);
});
