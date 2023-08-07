import once from 'lodash/once';

export function loadPi(_delay: number): () => Promise<void> {
  return once(async () => {
    await import(
      /* webpackMode: 'eager' */ '../../platform-implementation-js/main'
    );
  });
}
