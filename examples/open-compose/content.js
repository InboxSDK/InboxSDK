InboxSDK.load(1, 'open-compose').then(function(inboxSDK){

	inboxSDK.Views.getComposeView().then(function(composeView){

		composeView.setToRecipients(['oismail@gmail.com']);

	});

});
