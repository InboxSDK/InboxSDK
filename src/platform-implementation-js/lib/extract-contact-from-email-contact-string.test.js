/* @flow */

import extractContactFromEmailContactString from './extract-contact-from-email-contact-string';

it('should work with just an email address', () => {
  expect(extractContactFromEmailContactString('monkeys@monkeys.com')).toEqual({
    name: null,
    emailAddress: 'monkeys@monkeys.com'
  });
});

it('should work with a name', () => {
  expect(
    extractContactFromEmailContactString('George Monkey <monkeys@monkeys.com>')
  ).toEqual({ name: 'George Monkey', emailAddress: 'monkeys@monkeys.com' });
});

it('should work spaces around an email address', () => {
  expect(
    extractContactFromEmailContactString('  monkeys@monkeys.com  ')
  ).toEqual({ name: null, emailAddress: 'monkeys@monkeys.com' });
});

it('should work with spaces around a name', () => {
  expect(
    extractContactFromEmailContactString(
      '  George Monkey <monkeys@monkeys.com>'
    )
  ).toEqual({ name: 'George Monkey', emailAddress: 'monkeys@monkeys.com' });
});

it('throws on missing email address', () => {
  expect(() => {
    extractContactFromEmailContactString('foo bar');
  }).toThrowError();
});

it('filters out U+202C', () => {
  expect(
    extractContactFromEmailContactString('Foo Bar <s@gmail.com\u202c>')
  ).toEqual({ name: 'Foo Bar', emailAddress: 's@gmail.com' });
});
