console.log('content.js');

GmailSDK.ComposeManager.registerComposeButtonCreator(function(event) {
  console.log("creating compose button", event);
});

GmailSDK.Mailbox.on('example', function(obj) {
  console.log("example event received:", obj);
  //console.log("Current user email address:", GmailSDK.Email.getUser().emailAddress);
});

//console.log("Current user email address:", GmailSDK.Email.getUser().emailAddress);
