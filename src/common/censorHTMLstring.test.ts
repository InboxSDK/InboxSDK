import censorHTMLstring from './censorHTMLstring';

it('works', () => {
  expect(
    censorHTMLstring(
      'abc<b href="&amp;" bar src="foo==" a="1" class="whitelisted">foo</b><i src="aa"> </i>def',
    ),
  ).toBe(
    '...<b href="..." bar src="..." a="..." class="whitelisted">...</b><i src="..."></i>...',
  );
});

it('can handle attributes with special symbol', () => {
  expect(
    censorHTMLstring(
      `<div class="ar as" data-tooltip="Name <email@example.com>"><div class="at"><div class="au"><div class="av">Name</div></div></div></div>`,
    ),
  ).toBe(
    `<div class="ar as" data-tooltip="..."><div class="at"><div class="au"><div class="av">...</div></div></div></div>`,
  );
});
