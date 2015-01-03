InboxSDK.load(1.0, 'search-example').then(function(inboxSDK){

	inboxSDK.Router.registerRouteViewHandler(function(searchResultsView){
		if(searchResultsView.getRouteID() !== inboxSDK.Router.NativeRouteIDs.Search){
			return;
		}

		var section = searchResultsView.addResultsSection({
			sectionName: 'Monkeys'
		});

		setTimeout(function(){
			section.setResults([
				{
					title: 'title',
					body: 'body',
					extraText: 'extra',
					iconUrl: chrome.runtime.getURL('monkey.png'),
					onClick: function(){
						console.log('hi');
					}
				},
				{
					title: 'wagon of monkeys',
					body: '2222',
					routeName: 'inbox'
				}
			]);
		}, 2000);

		section.on('expanded', console.log.bind(console, 'expanded'));
		section.on('collapsed', console.log.bind(console, 'collapsed'));

	});

});
