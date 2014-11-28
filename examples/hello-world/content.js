var inboxSDK = new InboxSDK('hello-world');

inboxSDK.Compose.registerComposeViewHandler(function(composeView) {
	composeView.addButton({
		title: "Beep",
		iconUrl: 'https://mailfoogae.appspot.com/build/images/snippetIcon.png',
		type: 'MODIFIER',
		onClick: function(event) {
			console.log(event);
		}
	});
	['close','sending','sent'].forEach(function(evtName) {
		composeView.on(evtName, function(evt) {
			console.log('composeView', evtName, evt);
			alert(evtName+': '+evt);
		});
	});
});
