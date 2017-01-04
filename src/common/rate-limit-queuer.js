/* @flow */

// Returns a wrapped version of the function which queues up callTimestamps to the
// function if it is called more than count times within period amount of time.
export default function rateLimitQueuer<T: (...args: any) => Promise<any>>(fn: T, period: number, count: number): T {
  let callTimestamps: Array<number> = [];
  let queue: Array<()=>void> = [];
  let runningQueue = false;

  function runJob() {
    const job = queue.shift();
    job();
    if (queue.length) {
      runQueue();
    } else {
      runningQueue = false;
    }
  }

  function runQueue() {
    runningQueue = true;

    const timeToWait = getTimeToUnqueueItem();
    if (timeToWait > 0) {
      setTimeout(runJob, timeToWait);
    } else {
      runJob();
    }
  }

  function getTimeToUnqueueItem(): number {
    const now = Date.now();
    const periodAgo = now-period;
    callTimestamps = callTimestamps.filter(time => time > periodAgo);

    if (callTimestamps.length >= count) {
      return callTimestamps[0] - periodAgo;
    }
    return -1;
  }

  return (function attempt() {
    let job;
    const promise = new Promise((resolve, reject) => {
      job = () => {
        callTimestamps.push(Date.now());
        try {
          resolve(fn.apply(this, arguments));
        } catch(err) {
          reject(err);
        }
      };
    });
    if (!job) throw new Error("Should not happen");

    queue.push(job);
    if (!runningQueue) {
      runQueue();
    }

    return promise;
  }: any);
}
