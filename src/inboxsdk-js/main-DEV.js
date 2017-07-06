/* eslint-disable flowtype/require-valid-file-annotation */

require('./loading/platform-implementation-loader')._loadScript = require('./loading/load-platform-implementation-DEV')(500);
module.exports = require('./main');
