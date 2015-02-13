InboxSDK.load('1', 'Hello World!').then(function(sdk){

	// the SDK has been loaded, now do something with it!
	sdk.Compose.registerComposeViewHandler(function(composeView){

		// a compose view has come into existence, do something with it!
		composeView.addButton({
			title: "My Nifty Button!",
			iconUrl: 'http://www.w3schools.com/html/html5.gif',
			onClick: function(event) {
				event.composeView.insertTextIntoBodyAtCursor('Hello World!');
			},
		});

	});

});
