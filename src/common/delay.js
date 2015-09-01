/* @flow */
//jshint ignore:start

export default function delay<T>(time: number, value: T): Promise<T> {
  return new Promise((resolve, reject) => {
    setTimeout(() => resolve(value), time);
  });
}
