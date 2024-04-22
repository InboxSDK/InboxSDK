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
      browser.scripting.executeScript({
        target: { tabId: sender.tab.id, frameIds: [sender.frameId] },
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
