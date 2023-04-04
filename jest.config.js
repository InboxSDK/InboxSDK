'use strict';

module.exports = {
  moduleNameMapper: {
    '\\.css$': require.resolve('jest-css-modules'),
  },
  modulePathIgnorePatterns: ['/packages/core/src/*'],
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/test/',
    '/packages/core/src/',
  ],
  testRunner: 'jest-circus/runner',
};
