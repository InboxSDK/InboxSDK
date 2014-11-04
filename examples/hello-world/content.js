var inboxSDK = new InboxSDK('simple-example');

inboxSDK.Views.on('composeOpen', function(composeView){

	console.log('compose view', composeView);

});
