InboxSDK.load(1, 'contact-hover-example').then(function(sdk){

  window._sdk = sdk;

  sdk.Conversations.registerMessageViewHandler(function(messageView){

    messageView.on('contactHover', function(event){
      console.log('hovered', event);
    });

    setTimeout(function(){
      console.log('recipients:', messageView.getRecipients());
      console.log('sender', messageView.getSender().name);
    }, 10);

  });

});
