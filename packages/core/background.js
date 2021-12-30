chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'injectPageWorld' && sender.tab) {
    chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      world: 'MAIN',
      files: ['pageWorld.js']
    });
  }
});
