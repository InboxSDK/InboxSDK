/* @flow */

var assert = require('assert');
import cachebustUrl from '../src/common/cachebust-url';

describe('cachebustUrl', function() {
  it('works on a new url', function() {
    const url = '/foo/bar.js';
    const url2 = cachebustUrl(url);
    assert.notStrictEqual(url2, url);
    assert.strictEqual(url2.split('?')[0], url);
  });

  it('works on an already cachebusted url', function() {
    const url = '/foo/bar.js';
    const url2 = cachebustUrl(url);
    const url3 = cachebustUrl(url2);
    assert.notStrictEqual(url3, url2);
    assert.strictEqual(url3.split('?').length, 2);
    assert.strictEqual(url3.split('?')[0], url2.split('?')[0]);
  });
});
