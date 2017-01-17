/* @flow */

// This is a drop-in replacement for RSVP.defer(). New code should avoid using
// this, and should use the Promise constructor instead!

type Defer<T> = {
  resolve: (value: T) => void;
  reject: (err: any) => void;
  promise: Promise<T>;
};

export default function defer<T>(): Defer<T> {
  let resolve: any = undefined;
  let reject: any = undefined;
  const promise = new Promise((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });
  return {resolve, reject, promise};
}
