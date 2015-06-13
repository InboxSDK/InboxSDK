InboxSDK.load('1', 'sidebar-contact-example').then(function(sdk){

	sdk.Conversations.registerThreadViewHandler(function(threadView){
		console.log('threadView id', threadView.getThreadID());

		var messages = threadView.getMessageViews();
		messages.forEach(function(message) {
			console.log(message.getDateString());
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
