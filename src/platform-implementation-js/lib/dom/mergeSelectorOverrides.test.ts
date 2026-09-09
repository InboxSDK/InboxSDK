import mergeSelectorOverrides, {
  isValidSelector,
} from './mergeSelectorOverrides';

const DEFAULTS = {
  'a.one': ['.specific', '.general'],
  'a.two': ['.other'],
} as const satisfies Record<string, readonly string[]>;

test('no overrides leaves every chain untouched', () => {
  expect(mergeSelectorOverrides(DEFAULTS, {})).toEqual(DEFAULTS);
});

test('an override is prepended and the bundled chain survives as the tail', () => {
  expect(mergeSelectorOverrides(DEFAULTS, { 'a.one': ['.hotfix'] })).toEqual({
    'a.one': ['.hotfix', '.specific', '.general'],
    'a.two': ['.other'],
  });
});

test('an unknown key has nowhere to land', () => {
  const merged = mergeSelectorOverrides(DEFAULTS, {
    'a.fromANewerConfig': ['.whatever'],
  } as Record<string, string[]>);

  expect(merged).toEqual(DEFAULTS);
});

test('re-listing a bundled selector promotes it rather than duplicating it', () => {
  expect(mergeSelectorOverrides(DEFAULTS, { 'a.one': ['.general'] })).toEqual({
    'a.one': ['.general', '.specific'],
    'a.two': ['.other'],
  });
});

test('an unparseable candidate is dropped and reported, and the key still works', () => {
  const onInvalid = jest.fn();
  const merged = mergeSelectorOverrides(
    DEFAULTS,
    { 'a.one': ['.foo[', '.hotfix'] },
    onInvalid,
  );

  expect(merged['a.one']).toEqual(['.hotfix', '.specific', '.general']);
  expect(onInvalid).toHaveBeenCalledWith('a.one', '.foo[');
});

test('the bundled defaults are not mutated', () => {
  mergeSelectorOverrides(DEFAULTS, { 'a.one': ['.hotfix'] });

  expect(DEFAULTS['a.one']).toEqual(['.specific', '.general']);
});

test('isValidSelector parses rather than matches', () => {
  expect(isValidSelector('.nothing-in-this-document')).toBe(true);
  expect(isValidSelector('.foo[')).toBe(false);
});
