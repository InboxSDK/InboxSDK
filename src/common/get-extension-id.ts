export default function getExtensionId(): string | null {
  try {
    const chrome: any = (global as any).chrome;
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
    console.error('Failed to get extension ID:', e);
  }
  return null;
}
