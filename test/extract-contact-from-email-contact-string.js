/* @flow */

import assert from 'assert';

import extractContactFromEmailContactString from '../src/platform-implementation-js/lib/extract-contact-from-email-contact-string';

describe('extractContactFromString', function(){

  it('should work with just an email address', function(){
    assert.deepEqual(
      extractContactFromEmailContactString('monkeys@monkeys.com'),
      {name: null, emailAddress: 'monkeys@monkeys.com'}
    );
  });

  it('should work with a name', function(){
    assert.deepEqual(
      extractContactFromEmailContactString('George Monkey <monkeys@monkeys.com>'),
      {name: 'George Monkey', emailAddress: 'monkeys@monkeys.com'}
    );
  });

  it('should work spaces around an email address', function() {
    assert.deepEqual(
      extractContactFromEmailContactString('  monkeys@monkeys.com  '),
      {name: null, emailAddress: 'monkeys@monkeys.com'}
    );
  });

  it('should work with spaces around a name', function(){
    assert.deepEqual(
      extractContactFromEmailContactString('  George Monkey <monkeys@monkeys.com>'),
      {name: 'George Monkey', emailAddress: 'monkeys@monkeys.com'}
    );
  });

  it('throws on missing email address', function() {
    assert.throws(() => {
      extractContactFromEmailContactString('foo bar');
    });
  })
});
