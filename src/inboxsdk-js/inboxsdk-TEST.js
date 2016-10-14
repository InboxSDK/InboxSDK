require('./loading/platform-implementation-loader')._loadScript =
    require('./loading/load-platform-implementation-DEV')(0);

module.exports = require('./inboxsdk.js');
