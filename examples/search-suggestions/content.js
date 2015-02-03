function log() {
	console.log.apply(console, ['search-suggestions'].concat(Array.prototype.slice.call(arguments)));
}

InboxSDK.load(1, 'search-suggestions').then(function(inboxSDK) {
	inboxSDK.Search.registerSearchSuggestionsProvider(function(query) {
		log('search autocompleter', query);
		return [
			{
				name: 'aaaaaaa also bacon',
				iconURL: 'https://www.streak.com/build/images/boxIconOnNewCompose.png',
				externalURL: 'https://baconjs.github.io/api.html'
			},
			{
				name: 'beeeep',
				searchTerm: 'bop'
			},
			{
				name: 'Bacon API',
				description: 'Why not have a link in search?',
				externalURL: 'https://baconjs.github.io/api.html'
			},
			{
				name: 'Sent',
				description: 'Jumps to sent folder',
				iconURL: 'https://www.streak.com/build/images/boxIconOnNewCompose.png',
				routeName: inboxSDK.Router.NativeRouteIDs.SENT, routeParams: {page:2}
			}
		];
	});
});
