import once from 'lodash/once';

export function loadPi(delay: number): () => Promise<void> {
  return once(
    () =>
      new Promise((resolve, reject) => {
        setTimeout(() => {
          try {
            import(
              /* webpackMode: 'eager' */ '../../platform-implementation-js/main'
            )
              .then(() => resolve())
              .catch(reject);
          } catch (e) {
            reject(e);
          }
        }, delay);
      }),
  );
}
