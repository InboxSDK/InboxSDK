InboxSDK.load('1', 'sidebar-contact-example', {inboxBeta:true}).then(function(sdk){
	window._sdk = sdk;

	sdk.Conversations.registerMessageViewHandlerAll(function(messageView) {
		console.log('messageView all, loaded', messageView.isLoaded(), messageView);
	});

	sdk.Conversations.registerMessageViewHandler(function(messageView) {
		console.log('messageView id', messageView.getMessageID(), messageView);
	});

	sdk.Conversations.registerThreadViewHandler(function(threadView){
		console.log('threadView id', threadView.getThreadID(), threadView.getMessageViewsAll().length, threadView.getMessageViews().length);

		var messages = threadView.getMessageViewsAll();
		messages.forEach(function(message) {
			//console.log(message, message.isLoaded(), message.getViewState(), message.isLoaded() && message.getMessageID(), message.isLoaded() && message.getBodyElement());
		});
		var lastMessage = messages[messages.length - 1];

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

	});


});
