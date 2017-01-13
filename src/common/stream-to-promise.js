/* @flow */

import type EventEmitter from 'events';

// for nodejs streams
export default function streamToPromise(stream: EventEmitter): Promise<void> {
  return new Promise((resolve, reject) => {
    stream.on('error', err => {
      reject(err);
    });
    stream.on('finish', () => {
      resolve();
    });
  });
}
