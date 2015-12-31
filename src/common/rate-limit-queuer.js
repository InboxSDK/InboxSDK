/* @flow */
//jshint ignore:start

// Returns a wrapped version of the function which queues up callTimestamps to the
// function if it is called more than count times within period amount of time.
export default function rateLimitQueuer<T: (...args: any) => Promise<any>>(fn: T, period: number, count: number): T {
  let callTimestamps: Array<number> = [];
  let queue: Array<()=>void> = [];
  return (function() {
    const now = Date.now();
    const periodAgo = now-period;
    callTimestamps = callTimestamps.filter(time => time > periodAgo);

    if (callTimestamps.length >= count) {
      setTimeout(() => {
        const job = queue.shift();
        job();
      }, callTimestamps[0] - periodAgo);

      return new Promise((resolve, reject) => {
        queue.push(() => {
          callTimestamps.push(Date.now());
          resolve(fn.apply(this, arguments));
        });
      });
    }
    callTimestamps.push(now);
    const retVal = fn.apply(this, arguments);
    if (process.env.NODE_ENV !== 'production' && (!retVal || typeof retVal.then !== 'function')) {
      throw new Error("rateLimitQueuer can only be used with functions that return a Promise");
    }
    return retVal;
  }: any);
}
