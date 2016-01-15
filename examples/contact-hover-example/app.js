InboxSDK.load(1, 'contact-hover-example').then(function(sdk){

  window._sdk = sdk;

  sdk.Conversations.registerMessageViewHandlerAll(function(messageView){

    messageView.on('contactHover', function(event){
      console.log('hovered', event);
    });

  });

});
