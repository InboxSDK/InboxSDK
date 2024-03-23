'use strict';

console.log('InboxSDK: content script loaded');

// Set InboxSDK inject method
InboxSDK.setInjectScriptImplementation(() => {
  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = browser.runtime.getURL('pageWorld.js');
  document.documentElement.appendChild(script);

  console.log('InboxSDK: pageWorld.js manually injected!');
});

InboxSDK.load(2, 'firefox-mv3-example', {
  appName: 'Twitter',
  appIconUrl:
    'http://materialdesignblog.com/wp-content/uploads/2015/04/387b93c8b66379c32e1cc2b98dcf5197.png',
  suppressAddonTitle: 'Streak',
}).then((sdk) => {
  console.log('InboxSDK: has loaded', sdk);

  sdk.Compose.registerComposeViewHandler((view) => {
    view.addButton({
      title: 'My button',
      iconUrl: (globalThis.chrome || globalThis.browser).runtime.getURL(
        'monkey.png',
      ),
      onClick() {
        alert('my button works!');
      },
    });
  });
});
