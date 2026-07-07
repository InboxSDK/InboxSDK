import querySelectorWithFallbacks from './querySelectorWithFallbacks';

afterEach(() => {
  document.body.innerHTML = '';
});

test('returns the first matching selector', () => {
  document.body.innerHTML = '<div class="classic"></div>';
  const classic = document.body.querySelector('.classic');
  expect(querySelectorWithFallbacks(document, ['.classic', '.variant'])).toBe(
    classic,
  );
});

test('falls back to a later selector when earlier ones miss', () => {
  document.body.innerHTML = '<div class="variant"></div>';
  const variant = document.body.querySelector('.variant');
  expect(querySelectorWithFallbacks(document, ['.classic', '.variant'])).toBe(
    variant,
  );
});

test('respects selector order when multiple match', () => {
  document.body.innerHTML =
    '<div class="classic"></div><div class="variant"></div>';
  const classic = document.body.querySelector('.classic');
  expect(querySelectorWithFallbacks(document, ['.classic', '.variant'])).toBe(
    classic,
  );
});

test('throws when no selector matches', () => {
  document.body.innerHTML = '<div class="other"></div>';
  expect(() =>
    querySelectorWithFallbacks(document, ['.classic', '.variant']),
  ).toThrowError();
});
