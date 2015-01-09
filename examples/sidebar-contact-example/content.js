InboxSDK.load('1', 'sidebar-contact-example').then(function(sdk){

	sdk.Conversations.registerThreadViewHandler(function(threadView){

		var messages = threadView.getMessageViewsAll();
		var lastMessage = messages[messages.length - 1];

		console.log('viewState', lastMessage.getViewState());

		var sender = lastMessage.getSender();

		var el = document.createElement("div");
		el.textContent = "Hi, " + sender.name + ' <' + sender.emailAddress + '>';

		threadView.addSidebarContentPanel({
			title: 'Contact',
			el: el,
			orderHint: 1
		});


		threadView.on('contactHover', function(event){
			var contact = event.contact;
			console.log(contact);
			el.textContent = "Hi, " + contact.name + ' <' + contact.emailAddress + '>';
		});

		messages[1].on('viewStateChange', console.log.bind(console, 'viewStateChange'));
		messages[1].on('load', console.log.bind(console, 'load'));
		messages[1].on('destroy', console.log.bind(console, 'destroy'));

	});


});
