'use strict';

function log(...args) {
	console.log('search-suggestions', ...args);
}

InboxSDK.load(1, 'search-suggestions').then(inboxSDK => {
	window._sdk = inboxSDK;

	inboxSDK.Search.registerSearchSuggestionsProvider(query => {
		log('search autocompleter', query);
		return [
			{
				name: `bacon api ${query}`,
				iconUrl: 'https://www.streak.com/build/images/boxIconOnNewCompose.png',
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
				iconUrl: 'https://www.streak.com/build/images/boxIconOnNewCompose.png',
				routeName: inboxSDK.Router.NativeRouteIDs.SENT, routeParams: {page:2}
			}
		];
	});
});
