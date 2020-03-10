InboxSDK.load(2, 'header support button').then(function(sdk){
  window._sdk = sdk;

  const testElement = document.createElement('div')
  testElement.innerHTML = 'Streak help <img class="inboxsdk__button_iconImg" src="https://assets.streak.com/clientjs-release-builds/assets/logo.4cc0970dd9b42803f15cf37c8608a3bb.png">'

  sdk.Global.addSupportItem({
    element: testElement,
  }).then(p => window.globalCP = p);
});

