/** @type {import('webextension-polyfill').Browser} */
const browser = globalThis.chrome || globalThis.browser;
const isFirefox = /Firefox/.test(navigator.userAgent);

browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  const eventKey = 'inboxsdk__injectPageWorld';

  function executeScript() {
    if (browser.scripting) {
      /** @type {chrome.scripting.InjectionTarget} */
      const target = {
        tabId: sender.tab.id,
      };

      // Firefox does not support `documentIds`
      if (!isFirefox && sender.documentId) {
        // Protect against https://github.com/w3c/webextensions/issues/8 in
        // browsers (Chrome 106+) that support the documentId property.
        // Protections for other browsers happen inside the injected script.
        target.documentIds = [sender.documentId];
      } else {
        target.frameIds = [sender.frameId];
      }

      browser.scripting.executeScript({
        target,
        world: 'MAIN',
        files: ['pageWorld.js'],
      });
      sendResponse(true);
    } else {
      // MV2 fallback. Tell content script it needs to figure things out.
      sendResponse(false);
    }
  }

  if (message.type === eventKey && sender.tab) {
    // Relay event to firefox content script handler
    if (isFirefox) {
      browser.runtime.getBrowserInfo().then((info) => {
        const version = parseFloat(info.version);
  
        // MAIN world execution was not supported prior to v128
        // More info here: https://bugzilla.mozilla.org/show_bug.cgi?id=1736575
        // MDN compatibilty data: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/scripting/ExecutionWorld#browser_compatibility
        if (version < 128) {
          console.warn('InboxSDK: Firefox <128 does not support MAIN world execution. Using legacy mode.');
          return browser.tabs.sendMessage(sender.tab.id, { type: eventKey });
        }

        executeScript();
      });

      // must be returned to send above async response
      return true;
    }

    executeScript(); 
  }
});
