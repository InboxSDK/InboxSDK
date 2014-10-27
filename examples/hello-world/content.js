console.log('content.js');

GmailSDK.Mailbox.on('example', function(obj) {
  console.log("example event received:", obj);
  console.log("example object says:", obj.hello());
  console.log("Current user email address:", GmailSDK.Email.getUser().emailAddress);
});

//console.log("Current user email address:", GmailSDK.Email.getUser().emailAddress);
