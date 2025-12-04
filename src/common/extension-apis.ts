import once from 'lodash/once';

/** Refers to {@link chrome} or `browser` in firefox */
export const browser = globalThis.chrome || (globalThis as any).browser;

if (!browser) {
  throw new Error('chrome or browser not available in current context.');
}

export const getExtensionId = once((): string | null => {
  try {
    if (browser?.runtime?.getURL) {
      return browser.runtime.getURL('');
    }
    // MV2
    if (browser?.extension?.getURL) {
      return browser.extension.getURL('');
    }
  } catch (e) {
    // When an extension is reloaded or removed, then Chrome APIs in any of its
    // pre-existing content scripts start throwing "Extension context
    // invalidated" errors. We only use extension IDs for logging, so we
    // shouldn't treat this as fatal.
    console.error('Failed to read extension ID:', e);
  }

  return null;
});

// pre-cache the extension ID so we still know it inside this content script if
// the extension is reloaded or removed later.
getExtensionId();
