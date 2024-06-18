import once from 'lodash/once';

const getExtensionId = once((): string | null => {
  try {
    const chrome: any = (globalThis as any).chrome;
    if (chrome?.runtime?.getURL) {
      return chrome.runtime.getURL('');
    }
    // MV2
    if (chrome?.extension?.getURL) {
      return chrome.extension.getURL('');
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

export default getExtensionId;
