'use strict';

const path = require('path');
const os = require('os');

const pathToExtension = path.resolve(__dirname, '../../examples/browser-test');

const userDataDir = path.join(os.tmpdir(), 'jest_puppeteer_userDataDir');

module.exports = {
  launch: {
    headless: false,
    args: [
      `--disable-extensions-except=${pathToExtension}`,
      `--load-extension=${pathToExtension}`,
      '--window-size=1024,700'
    ],
    userDataDir
  }
};
