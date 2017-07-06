/* @flow */

import assert from 'assert';

import quotedSplit from '../src/common/quoted-split';

describe('quotedSplit', function() {
  it('should split basic strings on spaces', function() {
    const input = 'aaaa b cccc';
    assert.deepEqual(quotedSplit(input), ['aaaa', 'b', 'cccc']);
  });

  it('should ignore repeated spaces', function() {
    const input = 'aaaa b  cccc';
    assert.deepEqual(quotedSplit(input), ['aaaa', 'b', 'cccc']);
  });

  it('should ignore start and end spaces', function() {
    const input = '  aaaa b  cccc  ';
    assert.deepEqual(quotedSplit(input), ['aaaa', 'b', 'cccc']);
  });

  it('should not break quoted part', function() {
    const input = 'aaaa "b  cccc"  d';
    assert.deepEqual(quotedSplit(input), ['aaaa', '"b  cccc"', 'd']);
  });

  it('works with multiple quoted parts', function() {
    const input = 'aaaa "b  cccc"  d " f gh" "i"';
    assert.deepEqual(quotedSplit(input), ['aaaa', '"b  cccc"', 'd', '" f gh"', '"i"']);
  });
});
