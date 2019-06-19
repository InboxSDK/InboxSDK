'use strict';

// necessary until https://github.com/smooth-code/jest-puppeteer/issues/160 is fixed
process.env.JEST_PUPPETEER_CONFIG = require.resolve(
  './jest-puppeteer.config.js'
);

module.exports = {
  preset: 'jest-puppeteer',
  setupFilesAfterEnv: ['./jest.setupFilesAfterEnv.ts'],
  testRunner: 'jest-circus/runner'
};
