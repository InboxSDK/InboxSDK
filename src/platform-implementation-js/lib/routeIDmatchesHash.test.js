/* @flow */

import routeIDmatchesHash from './routeIDmatchesHash';

test('single parameter-less route works', () => {
	expect(routeIDmatchesHash('foo/bar/def', 'foo/bar/def')).toBe('foo/bar/def');
	expect(routeIDmatchesHash('foo/bar/def', 'foo/bax/def')).toBe(undefined);
});

test('array works', () => {
	expect(routeIDmatchesHash(['foo', 'bar'], 'foo')).toBe('foo');
	expect(routeIDmatchesHash(['foo', 'bar'], 'bar')).toBe('bar');
	expect(routeIDmatchesHash(['foo', 'bar'], 'blah')).toBe(undefined);
});

test('parameter works', () => {
	expect(routeIDmatchesHash('foo/:bar/def/:blah', 'foo/123/def/x1')).toBe('foo/:bar/def/:blah');
	expect(routeIDmatchesHash('foo/:bar/def/:blah', 'foo/123/xef/x1')).toBe(undefined);
});
