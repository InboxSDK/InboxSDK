require('./error-logging').setup();
require('./interface').load();

module.exports = require('./gmailsdk');
