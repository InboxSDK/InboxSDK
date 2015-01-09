InboxSDK.load('1', 'sidebar-contact-example').then(function(sdk){

	window.sdk = sdk;

	sdk.Conversations.registerThreadViewHandler(function(threadView){

		var messages = threadView.getMessageViews();
		var lastMessage = messages[messages.length - 1];

		var sender = lastMessage.getSender();

		var el = document.createElement("div");
		el.textContent = "Hi, " + sender.name + ' <' + sender.emailAddress + '>';

		threadView.addSidebarContentPanel({
			title: 'Contact',
			el: el,
			orderHint: 1
		});


		threadView.on('contactHover', function(contact){
			console.log(contact);
			el.textContent = "Hi, " + contact.name + ' <' + contact.emailAddress + '>';
		});

	});


});
