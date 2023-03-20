'use strict';

module.exports = {
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/test/',
    '/packages/core/src/',
  ],
  testRunner: 'jest-circus/runner',
};
