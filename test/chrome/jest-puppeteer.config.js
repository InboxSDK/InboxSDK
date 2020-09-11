'use strict';

const path = require('path');
const os = require('os');

const pathToExtension = path.resolve(__dirname, '../../examples/browser-test');

const userDataDir = path.join(os.tmpdir(), 'jest_puppeteer_userDataDir');

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

// Work around https://github.com/smooth-code/jest-puppeteer/issues/260
require.cache[require.resolve('puppeteer')] =
  require.cache[require.resolve('puppeteer-extra')];

module.exports = {
  launch: {
    headless: false,
    args: [
      `--disable-extensions-except=${pathToExtension}`,
      `--load-extension=${pathToExtension}`
    ],
    userDataDir
  }
};
