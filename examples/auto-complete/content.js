function log() {
	console.log.apply(console, ['auto-complete'].concat(Array.prototype.slice.call(arguments)));
}

InboxSDK.load(1, 'auto-complete').then(function(inboxSDK) {
	inboxSDK.Search.registerSearchAutoCompleter(function(event) {
		console.log('search autocompleter', event);
		return [
			{
				name: 'aaaaaaa',
				iconURL: 'https://www.streak.com/build/images/boxIconOnNewCompose.png'
			},
			{
				name: 'beeeep'
			},
			{
				name: 'name',
				description: 'description'
			},
			{
				name: 'name',
				description: 'description',
				iconURL: 'https://www.streak.com/build/images/boxIconOnNewCompose.png'
			}
		];
	});
});
