InboxSDK.load(2, 'header support button').then(function(sdk){
  window._sdk = sdk;

  const testElement = document.createElement('div')
  testElement.innerHTML = 'test'

  sdk.Global.addSupportItem({
    element: testElement,
    insertAfterIndex: 2
  }).then(p => window.globalCP = p);
});

