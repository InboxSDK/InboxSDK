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
	threadRowView.addAttachmentIcon(Bacon.repeatedly(2000, [
		{
			iconUrl: 'https://ssl.gstatic.com/mail/sprites/general_black-16bf964ab5b51c4b7462e4429bfa7fe8.png',
			title: 'thing'
		},
		{
			iconUrl: 'https://ssl.gstatic.com/ui/v1/icons/mail/gplus.png',
			title: 'blah blah'
		}
	]));
	threadRowView.replaceDate({text: Math.random() > 0.5 ? 'Returning in: 6 months' : 'aaa', textColor: 'green', title: 'beep'});
	threadRowView.addButton({
		iconUrl: 'https://mailfoogae.appspot.com/build/images/listIndicatorDark.png',
		// opacity 0.4
		// https://mailfoogae.appspot.com/build/images/listIndicator.png
		onClick: function(event) {
			console.log('threadrow got click event', event, threadRowView);
		}
	});
});
