/* @flow */

import cachebustUrl from './cachebust-url';

it('works on a new url', () => {
  const url = '/foo/bar.js';
  const url2 = cachebustUrl(url);
  expect(url2).not.toBe(url);
  expect(url2.split('?')[0]).toBe(url);
});

it('works on an already cachebusted url', () => {
  const url = '/foo/bar.js';
  const url2 = cachebustUrl(url);
  const url3 = cachebustUrl(url2);
  expect(url3).not.toBe(url2);
  expect(url3.split('?').length).toBe(2);
  expect(url3.split('?')[0]).toBe(url2.split('?')[0]);
});
