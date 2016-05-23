InboxSDK.load(1, 'simple-example', {inboxBeta:true}).then(function(inboxSDK) {
	inboxSDK.Compose.registerComposeViewHandler(function(composeView){

		window.composeView = composeView;
		composeView.overrideEditSubject();

	});

	inboxSDK.Conversations.registerThreadViewHandler(function(threadView){

		let num = 0;
		const messages = threadView.getMessageViews();
		for(let ii=0; ii<messages.length; ii++){
			if(messages[ii].hasOpenReply()) num++
		}

		console.log('number of messages open', num);
	});
});
