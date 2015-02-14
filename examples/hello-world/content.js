InboxSDK.load(1, 'hello-world').then(function(inboxSDK) {

	function log() {
		console.log.apply(console, ['hello-world'].concat(Array.prototype.slice.call(arguments)));
	}

	inboxSDK.Compose.registerComposeViewHandler(function(composeView) {
		composeView.addButton({
			title: "Beep",
			iconUrl: 'https://mailfoogae.appspot.com/build/images/snippetIcon.png',
			type: 'MODIFIER',
			onClick: function(event) {
				log('onClick', event);
			}
		});
		['close','sending','sent'].forEach(function(evtName) {
			composeView.on(evtName, function(evt) {
				log('composeView', evtName, evt);
			});
		});

		inboxSDK.ButterBar.showMessage({text:'a<b>c'});
	});

	var i = 0;
	inboxSDK.Lists.registerThreadRowViewHandler(function(threadRowView) {
		threadRowView.addLabel({
			title:'1'
		});
		threadRowView.addLabel({
			title:'a'+(i++),
			backgroundColor:'white',
			foregroundColor:'blue'
		});
		threadRowView.addAttachmentIcon({
			iconUrl: 'https://ssl.gstatic.com/ui/v1/icons/mail/gplus.png',
			title: 'blah blah'
		});
	});
});
