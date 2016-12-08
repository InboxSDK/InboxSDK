/* @flow */

import parseParamsFromRouteID from './parseParamsFromRouteID';

test('empty', () => {
  expect(parseParamsFromRouteID('test', 'test')).toEqual({});
});

test('works', () => {
  expect(parseParamsFromRouteID('test/:id/blah/:foo', 'test/123/blah/456')).toEqual({
    id: '123',
    foo: '456'
  });
});

test('decodes URI component', () => {
  expect(
    parseParamsFromRouteID('test/:id/blah/:foo', 'test/123/blah/test+%3C%3E%2B%22\'%26%20_')
  ).toEqual({
    id: '123',
    foo: 'test <>+"\'& _'
  });
});
