/* eslint-disable flowtype/require-valid-file-annotation */

const {
  injectScriptEmbedded,
} = require('../platform-implementation-js/lib/inject-script-EMBEDDED');
require('../platform-implementation-js/lib/inject-script').setInjectScriptImplementation(
  injectScriptEmbedded
);

module.exports = require('./inboxsdk-NONREMOTE');
