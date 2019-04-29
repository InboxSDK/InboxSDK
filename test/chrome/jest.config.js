'use strict';

process.env.JEST_PUPPETEER_CONFIG = require.resolve(
  './jest-puppeteer.config.js'
);

module.exports = {
  preset: 'jest-puppeteer',
  setupTestFrameworkScriptFile: './jest.setupTestFrameworkScriptFile.js'
};
