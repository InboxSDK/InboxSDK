/* @flow */

import _ from 'lodash';
import assert from 'assert';
import jsdomDoc from './lib/jsdom-doc';
import insertElementInOrder from '../src/platform-implementation-js/lib/dom/insert-element-in-order';

describe('insertElementInOrder', function() {
  const document = jsdomDoc(`<!doctype html>
<html>
<head><title>foo</title></head>
<body>
  <div id="alpha"   data-group-order-hint="foo1234"></div>
  <div id="beta"    data-group-order-hint="foo124"></div>
  <div id="charlie" data-group-order-hint="foo124" data-order-hint="30"></div>
  <div id="delta"   data-group-order-hint="foo124" data-order-hint="100"></div>
</body>
</html>`);

  const alpha = document.getElementById('alpha');
  const beta = document.getElementById('beta');
  const charlie = document.getElementById('charlie');
  const delta = document.getElementById('delta');

  function index(el) {
    return _.indexOf((document.body:any).children, el);
  }

  it("works", function() {
    const alpha2 = document.createElement('div');
    alpha2.setAttribute('data-group-order-hint', 'foo1235');
    insertElementInOrder((document.body:any), alpha2);
    assert.strictEqual(index(alpha2), index(alpha)+1);

    const charlie2 = document.createElement('div');
    charlie2.setAttribute('data-group-order-hint', 'foo124');
    charlie2.setAttribute('data-order-hint', '45');
    insertElementInOrder((document.body:any), charlie2);
    assert.strictEqual(index(charlie2), index(charlie)+1);
  });
});
