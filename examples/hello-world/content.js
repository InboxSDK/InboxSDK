var gmailSDK = new GmailSDK('simple-example');

gmailSDK.ComposeManager.registerComposeButtonCreator(function(event) {
  console.log("creating compose button", event);
});

gmailSDK.Mailbox.on('example', function(obj) {
  console.log("example event received:", obj);
});

gmailSDK.Util.track("script started track this", {d:1,e:"abc track"});
gmailSDK.Util.logError("script started log error this", {d:2,e:"abc err"});
