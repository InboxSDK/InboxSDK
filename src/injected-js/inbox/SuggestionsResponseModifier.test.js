/* @flow */

import SuggestionsResponseModifier from './SuggestionsResponseModifier';

test('works', () => {
  const s = new SuggestionsResponseModifier(require('./testdata/r2r-suggest.json'));
});
