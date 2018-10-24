/* @flow */

import isValidEmail from './is-valid-email';

it('should reject invalid email addresses', () => {
  expect(isValidEmail('')).toBe(false);
  expect(isValidEmail(' ')).toBe(false);
  expect(isValidEmail('monkeys')).toBe(false);
  expect(isValidEmail('<monkeys@com')).toBe(false);
});

it('should accept valid email addresses', () => {
  expect(isValidEmail('monkeys@com')).toBe(true);
  expect(isValidEmail('monkeys@monkeys.com')).toBe(true);
  expect(isValidEmail('monkeys.monkeys@monkeys.com')).toBe(true);
  expect(isValidEmail('monkeys.monkeys+monkeys@monkeys.com')).toBe(true);
  expect(isValidEmail('monkeys.monkeys+monkeys@monkeys.co.uk.fun')).toBe(true);
  expect(isValidEmail('monkeys.@monkeys.com')).toBe(true);
  expect(isValidEmail('"<monkeys"@c-om')).toBe(true);
  expect(isValidEmail('monkeys@monkeys‐marketing.com')).toBe(true);
});
