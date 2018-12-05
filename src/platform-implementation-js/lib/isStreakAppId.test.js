/* @flow */

import isStreakAppId from './isStreakAppId';

it('works', () => {
  expect(isStreakAppId('sdk_streak_21e9788951')).toBe(true);
});

it('fails', () => {
  expect(isStreakAppId('sdk_streak_21e9788952')).toBe(false);
});
