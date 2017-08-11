/* @flow */

import createLink from './createLink';

function makeDriver(): any {
  const customRouteIDs = new Set();
  return {
    getCustomRouteIDs: () => customRouteIDs
  };
}

test('works for custom view', () => {
  const driver = makeDriver();
  driver.getCustomRouteIDs().add('example/:bar');
  expect(createLink(driver, 'example/:bar', {bar: 'foo'})).toBe('#example/foo');
});

test('fails for unknown route id', () => {
  expect(() => createLink(makeDriver(), 'example/:bar', {bar: 'foo'}))
    .toThrowError('Invalid routeID: example/:bar');
});

test('fails for native route ids', () => {
  expect(() => createLink(makeDriver(), 'inbox/:threadID', {threadID: 'abc'}))
    .toThrowError('NativeRouteIDs are not currently supported in Inbox');
});
