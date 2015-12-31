/* @flow */
//jshint ignore:start

import RSVP from 'rsvp';

// Returns a wrapped version of the function which queues up calls to the
// function if it is called more than count times within period amount of time.
export default function rateLimitQueuer<T: (...args: any) => Promise<any>>(fn: T, period: number, count: number): T {
  let calls: Array<number> = [];
  let queue: Array<()=>void> = [];
  return (function() {
    const now = Date.now();
    const periodAgo = now-period;
    calls = calls.filter(time => time > periodAgo).slice(0, count);
    if (calls.length >= count) {
      setTimeout(() => {
        const job = queue.shift();
        job();
      }, calls[0] - periodAgo);

      return new RSVP.Promise((resolve, reject) => {
        queue.push(() => {
          resolve(fn.apply(this, arguments));
        });
      });
    }
    calls.push(now);
    const retVal = fn.apply(this, arguments);
    if (process.env.NODE_ENV !== 'production' && (!retVal || typeof retVal.then !== 'function')) {
      throw new Error("rateLimitQueuer can only be used with functions that return a Promise");
    }
    return retVal;
  }: any);
}
