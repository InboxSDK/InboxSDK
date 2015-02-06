function log() {
	console.log.apply(console, ['thread-rows'].concat(Array.prototype.slice.call(arguments)));
}

InboxSDK.load(1, 'thread-rows').then(function(inboxSDK) {
	var i = 0;
	inboxSDK.Lists.registerThreadRowViewHandler(function(threadRowView) {
		var threadId = threadRowView.getThreadID();
		//console.log('threadRowView', threadId, threadRowView.getThreadIDIfStable(), threadRowView.getVisibleDraftCount(), threadRowView.getVisibleMessageCount(), threadRowView.getSubject());
		threadRowView.addLabel(Bacon.repeatedly(10000, [
			{title:'A'},
			{title:'B', foregroundColor: 'blue'}
		]).toProperty({title:'0'}));
		threadRowView.addLabel({
			title:'a'+(i++),
			backgroundColor:'white',
			foregroundColor:'blue'
		});
		threadRowView.addAttachmentIcon(Bacon.repeatedly(2000, [
			{
				iconClass: 'test_icon_thing',
				title: 'thing'
			},
			{
				iconUrl: 'https://ssl.gstatic.com/ui/v1/icons/mail/gplus.png',
				title: 'blah blah'
			}
		]));
		threadRowView.replaceDate({text: Math.random() > 0.5 ? 'Returning in: 6 months' : 'aaa', textColor: 'green', title: 'beep'});

		var buttonBus = new Bacon.Bus();
		threadRowView.addButton(buttonBus.toProperty());
		buttonBus.push({
			iconUrl: 'https://mailfoogae.appspot.com/build/images/listIndicatorDark.png',
			className: 'buttonLight',
			hasDropdown: true,
			onClick: function(event) {
				event.dropdown.el.innerHTML += 'beep <b>beep</b><br>aaa<br>aaaaaa';

				buttonBus.plug(Bacon.sequentially(1000, [
					null,
					{
						iconUrl: 'https://mailfoogae.appspot.com/build/images/listIndicator.png',
						hasDropdown: true,
						onClick: function(event) {
							event.dropdown.el.innerHTML += 'something new<p>new<p><b>more new';

							event.dropdown.on('unload', function() {
								console.log('thread row button dropdown closed');
							});
							setTimeout(function() {
								event.dropdown.close();
							}, 10000);
						}
					}
				]));
			}
		});
	});

});
