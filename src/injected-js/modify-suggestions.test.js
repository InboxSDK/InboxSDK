/* @flow */

import assert from 'assert';

import modifySuggestions from './modify-suggestions';

test('works on old suggestion response', () => {
  const {responseText, modifications} = require('../../test/data/modify-suggestions-old.json');
  const modified = modifySuggestions(responseText, modifications);
  expect(JSON.stringify(modified)).toMatchSnapshot();
});

test('works on new suggestion response', () => {
  const {responseText, modifications} = require('../../test/data/modify-suggestions-2016-10-04.json');
  const modified = modifySuggestions(responseText, modifications);
  expect(JSON.stringify(modified)).toMatchSnapshot();
});
