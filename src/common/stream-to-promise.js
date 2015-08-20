/* @flow */
//jshint ignore:start

import type {Stream} from 'stream';
var RSVP = require('rsvp');

// for nodejs streams
export default function streamToPromise(stream: Stream): Promise<void> {
  return new RSVP.Promise(function(resolve, reject) {
    stream.on('error', function(err) {
      reject(err);
    });
    stream.on('finish', function() {
      resolve();
    });
  });
}
