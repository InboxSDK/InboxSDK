/** @type {import('webextension-polyfill').Browser} */
const browser = globalThis.chrome || globalThis.browser;
const isFirefox = /Firefox/.test(navigator.userAgent);

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const eventKey = 'inboxsdk__injectPageWorld';

  if (message.type === eventKey && sender.tab) {
    // Relay event to firefox content script handler
    if (isFirefox) {
      return browser.tabs.sendMessage(sender.tab.id, { type: eventKey });
    }

    if (browser.scripting) {
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
