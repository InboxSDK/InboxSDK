function log() {
	console.log.apply(console, ['thread-rows'].concat(Array.prototype.slice.call(arguments)));
}

InboxSDK.load(1, 'thread-rows').then(function(inboxSDK) {
	var i = 0;

	inboxSDK.Router.handleAllRoutes(function(routeView) {
		console.log('routeID', routeView.getRouteID());
		routeView.on('destroy', function() {
			console.log('routeView destroyed', routeView.getRouteID());
		});
	});

	inboxSDK.Lists.registerThreadRowViewHandler(function(threadRowView) {
		var threadId = threadRowView.getThreadID();
		//console.log('threadRowView', threadId, threadRowView.getThreadIDIfStable(), threadRowView.getVisibleDraftCount(), threadRowView.getVisibleMessageCount(), threadRowView.getSubject());

		threadRowView.addImage(Kefir.constant({
			imageUrl: 'https://lh6.googleusercontent.com/-dSK6wJEXzP8/AAAAAAAAAAI/AAAAAAAAAAA/Som6EQiIJa8/s64-c/photo.jpg',
			tooltip: 'Monkeys'
		}));

		threadRowView.addLabel(Kefir.repeatedly(5000, [
			{title:'A'},
			{title:'B', foregroundColor: 'blue', iconUrl: 'https://ssl.gstatic.com/ui/v1/icons/mail/gplus.png'},
			{title:'C', foregroundColor: 'red', iconClass: 'test_icon_thing'}
		]).toProperty({title:'0'}));
		threadRowView.addLabel({
			title:'a'+(i++),
			backgroundColor:'white',
			foregroundColor:'blue'
		});
		threadRowView.addAttachmentIcon(Kefir.repeatedly(2000, [
			{
				iconClass: 'test_icon_thing',
				title: 'thing'
			},
			{
				iconUrl: 'https://ssl.gstatic.com/ui/v1/icons/mail/gplus.png',
				title: 'blah blah'
			}
		]));
		threadRowView.replaceDraftLabel({
			name: 'Mail Merge',
			count: 420
		});
		threadRowView.replaceDate({
			text: Math.random() > 0.5 ? 'Returning in: 6 months' : 'aaa',
			tooltip: 'foo of bar',
			textColor: 'green', title: 'beep'});
		threadRowView.replaceDate(null);

		// threadRowView.addButton(Kefir.repeatedly(5000, [
		// 	{
		// 		iconUrl: 'https://mailfoogae.appspot.com/build/images/listIndicatorDark.png',
		// 		iconClass: 'buttonLight'
		// 	},
		// 	{
		// 		iconClass: 'test_button_thing',
		// 	}
		// ]));

		threadRowView.addButton({
			iconClass: 'test_button_thing',
		});

		var buttonBus = new Kefir.Bus();
		threadRowView.addButton(buttonBus.toProperty());
		buttonBus.emit({
			iconUrl: 'https://mailfoogae.appspot.com/build/images/listIndicatorDark.png',
			className: 'buttonLight',
			hasDropdown: true,
			onClick: function(event) {
				event.dropdown.el.innerHTML += 'beep <b>beep</b><br>aaa<br>aaaaaa';

				buttonBus.plug(Kefir.sequentially(1000, [
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
