InboxSDK.load(1.0, 'search-example').then(function(inboxSDK){

	inboxSDK.Router.handleListRoute(inboxSDK.Router.NativeRouteIDs.Search, function(listRouteView){

		var section = listRouteView.addCollapsibleSection({
			title: 'Monkeys'
		});

		setTimeout(function(){
			section.setTableRows([
				{
					title: 'title',
					body: 'body',
					shortDetailText: 'extra',
					iconUrl: chrome.runtime.getURL('monkey.png'),
					onClick: function(){
						console.log('hi');
					}
				},
				{
					title: 'wagon of monkeys',
					body: '2222',
					routeID: inboxSDK.Router.NativeRouteIDs.Inbox
				}
			]);
		}, 2000);

		section.on('expanded', console.log.bind(console, 'expanded'));
		section.on('collapsed', console.log.bind(console, 'collapsed'));

	});

});
