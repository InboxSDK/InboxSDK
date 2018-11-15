/* @flow */

import quotedSplit from './quoted-split';

it('should split basic strings on spaces', () => {
  const input = 'aaaa b cccc';
  expect(quotedSplit(input)).toEqual(['aaaa', 'b', 'cccc']);
});

it('should ignore repeated spaces', () => {
  const input = 'aaaa b  cccc';
  expect(quotedSplit(input)).toEqual(['aaaa', 'b', 'cccc']);
});

it('should ignore start and end spaces', () => {
  const input = '  aaaa b  cccc  ';
  expect(quotedSplit(input)).toEqual(['aaaa', 'b', 'cccc']);
});

it('should not break quoted part', () => {
  const input = 'aaaa "b  cccc"  d';
  expect(quotedSplit(input)).toEqual(['aaaa', '"b  cccc"', 'd']);
});

it('works with multiple quoted parts', () => {
  const input = 'aaaa "b  cccc"  d " f gh" "i"';
  expect(quotedSplit(input)).toEqual([
    'aaaa',
    '"b  cccc"',
    'd',
    '" f gh"',
    '"i"'
  ]);
});
