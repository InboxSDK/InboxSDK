/* @flow */
//jshint ignore:start

var assert = require('assert');
import jsdomDoc from "./lib/jsdom-doc";
import censorHTMLtree from '../src/common/censor-html-tree';

describe("censorHTMLtree", function() {
  var document = jsdomDoc(`<!doctype html>
<html>
<head><title>foo</title></head>
<body>
  <div id="canvas" role="foo&amp;" data-blah="foo">
    <div id="a">abc</div>
    <div id="b">d<b class="blah" data-foo="bar">e</b>f</div>
  </div>
  <div id="somethingextra">abc<i>i</i>foo</div>
  <div id="somethingextra2">abc<i>i</i>foo</div>
</body>
</html>`);

  it("works", function() {
    var divB = document.getElementById('b');
    assert.strictEqual(
      censorHTMLtree(divB),
      '<html>[1]<body><div id="canvas" role="foo&amp;" data-blah="...">[1]<div id="b">...<b class="blah" data-foo="...">...</b>...</div></div>[2]</body></html>'
    );
  });
});
