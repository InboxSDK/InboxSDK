/* @flow */

import get from './get-or-fail';

for (let value of ['string', {}, true, false, null, "''"]) {
  it(`works with ${JSON.stringify(value)}`, () => {
    const m = new Map();
    m.set('foo', value);
    expect(get(m, 'foo')).toBe(value);
  });
}

it('fails', () => {
  const m = new Map();
  expect(() => {
    get(m, 'foo');
  }).toThrowError();
});
