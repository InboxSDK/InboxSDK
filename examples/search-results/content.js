InboxSDK.newApp('search-example', '1').then(function(inboxSDK){

	inboxSDK.Router.registerSearchViewHandler(function(searchResultsView){

		var section = searchResultsView.addResultsSection({
			name: 'Monkeys'
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
