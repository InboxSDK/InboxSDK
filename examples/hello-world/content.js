var inboxSDK = new InboxSDK('hello-world');

function log() {
	console.log.apply(console, ['hello-world'].concat(arguments));
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
});

var i = 0;
inboxSDK.Mailbox.registerThreadRowViewHandler(function(threadRowView) {
	threadRowView.addLabel({
		text:'a'+(i++),
		color:'white',
		textColor:'blue'
	});
	threadRowView.addAttachmentIcon({
		iconUrl: 'https://ssl.gstatic.com/ui/v1/icons/mail/gplus.png',
		title: 'blah blah'
	});
});
