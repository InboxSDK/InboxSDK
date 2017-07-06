/* @flow */

import assert from 'assert';

import isValidEmail from '../src/platform-implementation-js/lib/is-valid-email';

describe('isValidEmail', function() {

  it('should reject invalid email addresses', function() {
    assert.equal(isValidEmail(''), false);
    assert.equal(isValidEmail(' '), false);
    assert.equal(isValidEmail('monkeys'), false);
    assert.equal(isValidEmail('<monkeys@com'), false);
  });

  it('should accept valid email addresses', function() {
    assert.equal(isValidEmail('monkeys@com'), true);
    assert.equal(isValidEmail('monkeys@monkeys.com'), true);
    assert.equal(isValidEmail('monkeys.monkeys@monkeys.com'), true);
    assert.equal(isValidEmail('monkeys.monkeys+monkeys@monkeys.com'), true);
    assert.equal(isValidEmail('monkeys.monkeys+monkeys@monkeys.co.uk.fun'), true);
    assert.equal(isValidEmail('monkeys.@monkeys.com'), true);
    assert.equal(isValidEmail('"<monkeys"@c-om'), true);
    assert.equal(isValidEmail('monkeys@monkeys‐marketing.com'), true);
  });

});
