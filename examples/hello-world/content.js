InboxSDK.load(2, 'Hello World!').then(function(sdk){

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

    const metaForm = composeView.getMetadataFormElement();
    if (metaForm) {
      const bb = metaForm.getBoundingClientRect();
      const div = document.createElement('div');
      div.innerHTML = "Look Ma, I'm floating!";

      document.body.appendChild(div);
      div.id = "floatingPane";
      div.style.padding = "10px";
      div.style.position = 'fixed';
      div.style.backgroundColor = 'white';
      div.style.border = "1px solid black";
      div.style.zIndex = 999;
      div.style.left = (bb.left - div.clientWidth - 20) + "px";
      div.style.top = bb.top + "px";
      
      const btn = document.createElement('button');
      btn.textContent = "Close";
      btn.onclick = (e) => {
        div.remove();
      }

      div.appendChild(btn);
    }
	});

	console.log('user email', sdk.User.getEmailAddress());
	console.log('all user contacts', sdk.User.getAccountSwitcherContactList());
});
