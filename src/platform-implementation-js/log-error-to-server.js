var Ajax = require('../common/ajax');
var _ = require('lodash');

module.exports = function(Email) {
  function logErrorToServer(reporterExtras, name, err, details) {
    return Email.getUserAsync().catch(function(err) {
      return null;
    }).then(function(user) {
      var stringReport = _.map(reporterExtras.stuffToLog, function(piece) {
        if (typeof piece == 'string') {
          return piece;
        } else {
          try {
            return JSON.stringify(piece);
          } catch(e) {
            return '((Could not convert to JSON))';
          }
        }
      }).join(' ');
      return Ajax({
        url: 'https://events.inboxsdk.com/api/v2/errors',
        method: 'POST',
        data: {
          error: stringReport,
          email: user ? user.emailAddress : null
        }
      });
    });
  }

  return logErrorToServer;
};
