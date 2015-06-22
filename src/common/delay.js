/* @flow */
//jshint ignore:start

import RSVP from 'rsvp';

export default function delay<T>(time: number, value?: T): Promise<T> {
  return new RSVP.Promise((resolve, reject) => {
    setTimeout(resolve.bind(null, value), time);
  });
}
