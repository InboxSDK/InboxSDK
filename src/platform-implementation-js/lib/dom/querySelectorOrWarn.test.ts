import { querySelectorOrWarn } from './querySelectorOrWarn';

const p = document.createElement('p');
document.body.appendChild(p);

test('works', () => {
  expect(querySelectorOrWarn(document, 'p')).toBe(p);
  expect(querySelectorOrWarn(document.body, 'p')).toBe(p);
});

test('fails', () => {
  // https://stackoverflow.com/a/56677834/1924257
  const consoleWarnMock = jest.spyOn(console, 'warn').mockImplementation();

  expect(querySelectorOrWarn(document, 'p.foo')).toBeNull();
  expect(consoleWarnMock).toHaveBeenCalledTimes(1);
  consoleWarnMock.mockRestore();
});
