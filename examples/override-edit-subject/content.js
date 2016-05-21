InboxSDK.load(1, 'simple-example', {inboxBeta:true}).then(function(inboxSDK) {
	inboxSDK.Compose.registerComposeViewHandler(function(composeView){

		window.composeView = composeView;
		composeView.overrideEditSubject();

	});
});
