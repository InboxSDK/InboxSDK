import once from 'lodash/once';

export default function (delay: number): () => Promise<void> {
  return once(
    () =>
      new Promise((resolve, reject) => {
        setTimeout(() => {
          try {
            require('../../platform-implementation-js/main');
            resolve();
          } catch (e) {
            reject(e);
          }
        }, delay);
      })
  );
}
