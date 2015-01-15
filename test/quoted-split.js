var assert = require('assert');

var quotedSplit = require('../src/common/quoted-split');

describe('quotedSplit', function() {
  it('should split basic strings on spaces', function() {
    var input = 'aaaa b cccc';
    assert.deepEqual(quotedSplit(input), ['aaaa', 'b', 'cccc']);
  });

  it('should ignore repeated spaces', function() {
    var input = 'aaaa b  cccc';
    assert.deepEqual(quotedSplit(input), ['aaaa', 'b', 'cccc']);
  });

  it('should ignore start and end spaces', function() {
    var input = '  aaaa b  cccc  ';
    assert.deepEqual(quotedSplit(input), ['aaaa', 'b', 'cccc']);
  });

  it('should not break quoted part', function() {
    var input = 'aaaa "b  cccc"  d';
    assert.deepEqual(quotedSplit(input), ['aaaa', '"b  cccc"', 'd']);
  });

  it('works with multiple quoted parts', function() {
    var input = 'aaaa "b  cccc"  d " f gh" "i"';
    assert.deepEqual(quotedSplit(input), ['aaaa', '"b  cccc"', 'd', '" f gh"', '"i"']);
  });
});
