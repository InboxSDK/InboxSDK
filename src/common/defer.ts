// This is a drop-in replacement for RSVP.defer(). New code should avoid using
// this, and should use the Promise constructor instead!

export interface Defer<T> {
  readonly resolve: (value: T) => void;
  readonly reject: (err: any) => void;
  readonly promise: Promise<T>;
}

export default function defer<T>(): Defer<T> {
  let resolve: any = undefined;
  let reject: any = undefined;
  const promise: Promise<any> = new Promise((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });
  return { resolve, reject, promise };
}
