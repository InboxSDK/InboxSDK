InboxSDK.load(1.0, 'search-example').then(function(inboxSDK){

	inboxSDK.Router.registerRouteViewHandler(function(searchResultsView){
		if(searchResultsView.getRouteID() !== inboxSDK.Router.NativeRouteIDs.Search){
			return;
		}

		var section = searchResultsView.addCollapsibleSection({
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
