console.log('content.js');

GmailSDK.ComposeManager.registerComposeButtonCreator(function(event) {
  console.log("creating compose button", event);
});

GmailSDK.Mailbox.on('example', function(obj) {
  console.log("example event received:", obj);
});

GmailSDK.Utils.track("script started", {d:1,e:"abc"});
