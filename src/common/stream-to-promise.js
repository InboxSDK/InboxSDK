/* @flow */
//jshint ignore:start

import RSVP from 'rsvp';

// for nodejs streams
export default function streamToPromise(stream: stream$Stream): Promise<void> {
  return new RSVP.Promise(function(resolve, reject) {
    stream.on('error', function(err) {
      reject(err);
    });
    stream.on('end', function() {
      resolve();
    });
  });
}
