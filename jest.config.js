'use strict';

module.exports = {
  modulePathIgnorePatterns: ['/packages/core/src/*'],
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/test/',
    '/packages/core/src/',
  ],
  testRunner: 'jest-circus/runner',
};
