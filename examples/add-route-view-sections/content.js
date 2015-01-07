InboxSDK.load(1.0, 'route-view-sections-example').then(function(inboxSDK){

	inboxSDK.Router.registerRouteViewHandler(function(searchResultsView){
		var view1 = searchResultsView.addCollapsibleSection({
			title: 'Monkeys',
			subtitle: 'chunkeys'
		});

		view1.setResults([
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
				routeID: inboxSDK.Router.NativeRouteIDs.Inbox
			}
		]);

		searchResultsView.addCollapsibleSection({
			title: 'Lions',
			subtitle: 'lions',
			summaryText: 'click me',
			onSummaryClick: function(){
				console.log('clicked!');
			},
			results: [
				{
					title: 'lion title',
					body: 'lion body',
					extraText: 'extra',
					iconUrl: chrome.runtime.getURL('lion.png'),
					onClick: function(){
						console.log('roar');
					}
				}
			]
		});


		searchResultsView.addCollapsibleSection({
			title: 'Third wheel',
			summaryText: 'click me',
			hasDropdown: true,
			onDropdownClick: function(event){
				event.dropdown.el.textContent = 'hello world';
			},
			results: [
				{
					title: 'wheels',
					onClick: function(){
						console.log('squeeeek');
					}
				}
			]
		});

	});

});
