'use strict';

const path = require('path');

const pathToExtension = path.resolve(__dirname, 'examples/browser-test');

module.exports = {
  launch: {
    headless: false,
    args: [
      `--disable-extensions-except=${pathToExtension}`,
      `--load-extension=${pathToExtension}`
    ]
  }
};
