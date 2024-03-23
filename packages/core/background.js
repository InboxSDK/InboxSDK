/** @type {import('webextension-polyfill').Browser} */
const browser = globalThis.chrome || globalThis.browser;

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'inboxsdk__injectPageWorld' && sender.tab) {
    // NPM_MV2_SUPPORT is required for firefox
    // as MAIN world execution is not supported in firefox yet
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1736575
    if ('browser' in globalThis) sendResponse(true);
    else if (browser.scripting) {
      // MV3
      let documentIds;
      let frameIds;
      if (sender.documentId) {
        // Protect against https://github.com/w3c/webextensions/issues/8 in
        // browsers (Chrome 106+) that support the documentId property.
        // Protections for other browsers happen inside the injected script.
        documentIds = [sender.documentId];
      } else {
        frameIds = [sender.frameId];
      }
      browser.scripting.executeScript({
        target: { tabId: sender.tab.id, documentIds, frameIds },
        world: 'MAIN',
        files: ['pageWorld.js'],
      });
      sendResponse(true);
    } else {
      // MV2 fallback. Tell content script it needs to figure things out.
      sendResponse(false);
    }
  }
});
