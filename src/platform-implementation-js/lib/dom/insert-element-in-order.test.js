/* @flow */

import _ from 'lodash';
import insertElementInOrder from './insert-element-in-order';

(document.body: any).innerHTML = `
<div id="zero">element with no order attributes</div>
<div id="alpha"   data-group-order-hint="foo1234"></div>
<div id="beta"    data-group-order-hint="foo124"></div>
<div id="charlie" data-group-order-hint="foo124" data-order-hint="30"></div>
<div id="delta"   data-group-order-hint="foo124" data-order-hint="100"></div>
`;

const zero = document.getElementById('zero');
const alpha = document.getElementById('alpha');
const beta = document.getElementById('beta');
const charlie = document.getElementById('charlie');
const delta = document.getElementById('delta');

function index(el) {
  return _.indexOf((document.body: any).children, el);
}

it('works', () => {
  const alpha2 = document.createElement('div');
  alpha2.id = 'alpha2';
  alpha2.setAttribute('data-group-order-hint', 'foo1235');
  insertElementInOrder((document.body: any), alpha2);
  expect(index(alpha2)).toBe(index(alpha) + 1);

  const charlie2 = document.createElement('div');
  charlie2.id = 'charlie2';
  charlie2.setAttribute('data-group-order-hint', 'foo124');
  charlie2.setAttribute('data-order-hint', '45');
  insertElementInOrder((document.body: any), charlie2);
  expect(index(charlie2)).toBe(index(charlie) + 1);
});

it('insertBeforeNonSdk', () => {
  const alpha3 = document.createElement('div');
  alpha3.id = 'alpha3';
  alpha3.setAttribute('data-group-order-hint', 'foo3');
  insertElementInOrder((document.body: any), alpha3, undefined, true);
  expect(index(alpha3)).toBe(index(zero) - 1);

  const alpha4 = document.createElement('div');
  alpha4.id = 'alpha4';
  alpha4.setAttribute('data-group-order-hint', 'foo4');
  insertElementInOrder((document.body: any), alpha4, undefined, true);
  expect(index(alpha4)).toBe(index(zero) - 1);
});
