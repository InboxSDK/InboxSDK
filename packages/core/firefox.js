/** @type {import('webextension-polyfill').Browser} */
const browser = globalThis.chrome || globalThis.browser;

// Manual code injection support for firefox <128
// As it did not support MAIN world execution
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'inboxsdk__injectPageWorld') {
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = browser.runtime.getURL('pageWorld.js');

    script.onload = () => console.log('InboxSDK: pageWorld.js has been loaded');
    script.onerror = (error) =>
      console.error('InboxSDK: pageWorld.js failed to load\n\n', error);

    document.head.appendChild(script);

    console.log('InboxSDK: pageWorld.js manually injected!');
    sendResponse(true);
  }
});

export * from './inboxsdk';
