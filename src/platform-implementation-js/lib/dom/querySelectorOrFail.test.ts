import querySelector from './querySelectorOrFail';

const p = document.createElement('p');
document.body.appendChild(p);

test('works', () => {
  expect(querySelector(document, 'p')).toBe(p);
  expect(querySelector(document.body, 'p')).toBe(p);
});

test('fails', () => {
  expect(() => querySelector(document, 'p.foo')).toThrowError();
});
