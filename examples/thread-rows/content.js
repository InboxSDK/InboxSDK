var inboxSDK = new InboxSDK('thread-rows');

function log() {
	console.log.apply(console, ['thread-rows'].concat(Array.prototype.slice.call(arguments)));
}

var i = 0;
inboxSDK.Mailbox.registerThreadRowViewHandler(function(threadRowView) {
	threadRowView.addLabel(Bacon.repeatedly(10000, [
		{text:'A'},
		{text:'B', textColor: 'blue'}
	]).toProperty({text:'0'}));
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
