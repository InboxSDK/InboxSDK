/* @flow */

import assert from 'assert';

import modifySuggestions from '../src/injected-js/modify-suggestions';

describe('modifySuggestions', function() {
  it('works on old suggestion response', function() {
    const {responseText, modifications, expected} = require('./data/modify-suggestions-old.json');
    const modified = modifySuggestions(responseText, modifications);
    assert.strictEqual(modified, expected);
  });
});
