var RSVP = require('rsvp');

// for nodejs streams
function streamToPromise(stream) {
  return new RSVP.Promise(function(resolve, reject) {
    stream.on('error', function(err) {
      reject(err);
    });
    stream.on('end', function() {
      resolve();
    });
  });
}

module.exports = streamToPromise;
