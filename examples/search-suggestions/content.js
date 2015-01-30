function log() {
	console.log.apply(console, ['search-suggestions'].concat(Array.prototype.slice.call(arguments)));
}

InboxSDK.load(1, 'search-suggestions').then(function(inboxSDK) {
	inboxSDK.Search.registerSearchSuggestionsProvider(function(query) {
		log('search autocompleter', query);
		return [
			{
				name: 'aaaaaaa',
				iconURL: 'https://www.streak.com/build/images/boxIconOnNewCompose.png'
			},
			{
				name: 'beeeep',
				searchTerm: 'bop'
			},
			{
				name: 'Bacon API',
				description: 'Why not have a link in search?',
				URL: 'https://baconjs.github.io/api.html'
			},
			{
				name: 'Drafts',
				description: 'Jumps to drafts folder',
				iconURL: 'https://www.streak.com/build/images/boxIconOnNewCompose.png',
				URL: '#drafts'
			}
		];
	});
});
