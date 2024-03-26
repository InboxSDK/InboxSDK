// Adds support for `chrome` in unit tests
if (!globalThis.chrome) {
  globalThis.chrome = {
    runtime: {
      id: 'testid',
    },
  };
}
