/* @flow */

import censorHTMLstring from './censorHTMLstring';

it('works', () => {
  expect(
    censorHTMLstring(
      'abc<b href="&amp;" bar src="foo==" a="1" class="whitelisted">foo</b><i src="aa"> </i>def'
    )
  ).toBe(
    '...<b href="..." bar src="..." a="..." class="whitelisted">...</b><i src="..."></i>...'
  );
});
