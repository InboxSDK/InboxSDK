/* @flow */

import populateRouteID from './populateRouteID';

test('works with no params', () => {
  expect(populateRouteID('a/b', null)).toBe('a/b');
});

test('works with params', () => {
  expect(populateRouteID('a/:id/b/:foo', {id: 'aaa', foo: '456'})).toBe('a/aaa/b/456');
});

test('works with params that are not preceded by a slash', () => {
  expect(populateRouteID('a/foo:id/b', {id: 'aaa'})).toBe('a/fooaaa/b');
});

test('url encodes', () => {
  expect(populateRouteID('a/:id', {id: '%/$\'"'})).toBe('a/%25%2F%24\'%22');
});

test('throws if missing params', () => {
  expect(() => populateRouteID('a/:id', {})).toThrowError();
});

test('throws if extra params', () => {
  expect(() => populateRouteID('a/:id', {id: '456', foo: '789'})).toThrowError();
});
