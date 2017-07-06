/* @flow */

import assert from 'assert';

import censorHTMLstring from '../src/common/censor-html-string';

describe('censorHTMLstring', function() {
  it('works', function() {
    assert.strictEqual(
      censorHTMLstring(
      'abc<b href="&amp;" bar src="foo==" a="1" class="whitelisted">foo</b><i src="aa"> </i>def'
      ),
      '...<b href="..." bar src="..." a="..." class="whitelisted">...</b><i src="..."></i>...'
    );
  });
});
