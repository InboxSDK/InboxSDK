/* @flow */

import incrementName from './incrementName';

test('works multiple times', () => {
  let name = 'Foobar';
  for (let i=2; i<21; i++) {
    name = incrementName(name);
    expect(name).toBe(`Foobar ${i}`);
  }
});

test('works with names containing numbers', () => {
  let name = 'Foo 2 bar ';
  for (let i=2; i<21; i++) {
    name = incrementName(name);
    expect(name).toBe(`Foo 2 bar  ${i}`);
  }
});
