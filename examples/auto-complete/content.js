function log() {
	console.log.apply(console, ['auto-complete'].concat(Array.prototype.slice.call(arguments)));
}

InboxSDK.load(1, 'auto-complete').then(function(inboxSDK) {
	inboxSDK.Search.registerSearchSuggestionsProvider(function(event) {
		console.log('search autocompleter', event);
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
