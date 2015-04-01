InboxSDK.load('1', 'Hello World!', {inboxBeta: true}).then(function(sdk){

	sdk.Router.handleAllRoutes(function(routeView) {
		console.log('got a routeView', routeView);
		console.log('routeType', routeView.getRouteType());
		console.log('routeID', routeView.getRouteID());
		console.log('params', routeView.getParams());
		routeView.on('destroy', function() {
			console.log('routeView destroyed', routeView.getRouteID());
		});
	});

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
