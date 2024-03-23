// Add support for webextension-polyfill in unit tests
if (!globalThis.chrome) {
  globalThis.chrome = {
    runtime: {
      id: 'testid',
    },
  };
}
