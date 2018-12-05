/* @flow */

import censorHTMLtree from './censorHTMLtree';

(document.documentElement: any).innerHTML = `
<head><title>foo</title></head>
<body>
  <div id="canvas" role="foo&amp;" data-blah="foo">
    <div id="a">abc</div>
    <div id="b">d<b class="blah" data-foo="bar">e</b>f</div>
  </div>
  <div id="somethingextra">abc<i>i</i>foo</div>
  <div id="somethingextra2">abc<i>i</i>foo</div>
</body>
`;

it('works', function() {
  const divB = document.getElementById('b');
  if (!divB) throw new Error();
  expect(censorHTMLtree(divB)).toBe(
    '<html>[1]<body><div id="canvas" role="foo&amp;" data-blah="...">[1]<div id="b">...<b class="blah" data-foo="...">...</b>...</div></div>[2]</body></html>'
  );
});
