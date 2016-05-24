/* @flow */

import assert from 'assert';

import isStreakAppId from '../src/platform-implementation-js/lib/is-streak-app-id';

describe('isStreakAppId', function() {
  it('works', function() {
    assert(isStreakAppId('sdk_streak_21e9788951'));
  });
  it('fails', function() {
    assert(!isStreakAppId('sdk_streak_21e9788952'));
  });
});
