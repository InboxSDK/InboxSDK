InboxSDK.load(1.0, 'search-example').then(function(inboxSDK){

	inboxSDK.Router.handleListRoute(inboxSDK.Router.NativeRouteIDs.SEARCH, function(listRouteView){

		var section = listRouteView.addCollapsibleSection({
			title: 'Monkeys',
			tableRows: [
				{
					title: 'title',
					body: 'body',
					shortDetailText: 'extra',
					isRead: true,
					iconUrl: chrome.runtime.getURL('monkey.png'),
					onClick: function(){
						console.log('hi');
					}
				},
				{
					title: 'wagon of monkeys',
					body: '2222',
					routeID: inboxSDK.Router.NativeRouteIDs.INBOX
				}
			]
		});


		section.on('expanded', console.log.bind(console, 'expanded'));
		section.on('collapsed', console.log.bind(console, 'collapsed'));

	});

});
