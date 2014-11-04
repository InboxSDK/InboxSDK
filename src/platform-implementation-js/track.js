var Ajax = require('../common/ajax');
var _ = require('lodash');

module.exports = function(Email) {
  function track(eventName, details) {
    return Email.getUserAsync().catch(function(err) {
      return null;
    }).then(function(user) {
      details = _.extend({
        'timestamp': new Date().getTime()*1000,
        'screenWidth': screen.width,
        'screenHeight': screen.height,
        'windowWidth': window.innerWidth,
        'windowHeight': window.innerHeight,
        'location': document.location.href,
        'referrer': document.referrer,
        'email': user && user.emailAddress
      }, details);

      // TODO queue a bunch before sending
      var events = [details];

      return Ajax({
        url: 'https://events.inboxsdk.com/api/v2/track',
        method: 'POST',
        data: {
          json: JSON.stringify({
            data: events,
            clientRequestTimestamp: new Date().getTime()*1000
          })
        }
      });
    });
  }

  return track;
};
