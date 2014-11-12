var inboxSDK = new InboxSDK('open-compose');

inboxSDK.ready().then(function(){

	inboxSDK.Views.getComposeView().then(function(composeView){

		composeView.setToRecipients(['oismail@gmail.com']);

	});

});
