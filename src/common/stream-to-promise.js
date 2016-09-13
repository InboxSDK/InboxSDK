/* @flow */

import type EventEmitter from 'events';
import RSVP from 'rsvp';

// for nodejs streams
export default function streamToPromise(stream: EventEmitter): Promise<void> {
  return new RSVP.Promise(function(resolve, reject) {
    stream.on('error', function(err) {
      reject(err);
    });
    stream.on('finish', function() {
      resolve();
    });
  });
}
