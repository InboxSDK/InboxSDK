/* @flow */

import gotoView from './gotoView';

function makeDriver(): any {
  const customRouteIDs = new Set();
  return {
    getCustomRouteIDs: () => customRouteIDs
  };
}

test('works for custom view', () => {
  const driver = makeDriver();
  driver.getCustomRouteIDs().add('example/:bar');
  gotoView(driver, 'example/:bar', {bar: 'foo'});
  expect(document.location.hash).toBe('#example/foo');
});

test('fails for unknown route id', () => {
  expect(() => gotoView(makeDriver(), 'example/:bar', {bar: 'foo'}))
    .toThrowError('Invalid routeID: example/:bar');
});

test('fails for native route ids', () => {
  expect(() => gotoView(makeDriver(), 'inbox/:threadID', {threadID: 'abc'}))
    .toThrowError('NativeRouteIDs are not currently supported in Inbox');
});
