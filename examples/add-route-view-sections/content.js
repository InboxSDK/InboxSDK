InboxSDK.load(1.0, 'route-view-sections-example').then(function(inboxSDK){

	inboxSDK.Router.registerRouteViewHandler(function(searchResultsView){
		var view1 = searchResultsView.addCollapsibleSection({
			title: 'Monkeys',
			subtitle: 'chunkeys'
		});

		view1.setTableRows([
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

		var view2 = searchResultsView.addCollapsibleSection({
			title: 'Lions',
			subtitle: 'lions',
			summaryText: 'click me',
			onSummaryClick: function(){
				console.log('clicked!');
			}
		});

		view2.setTableRows([
			{
				title: 'lion title',
				body: 'lion body',
				shortDetailText: 'extra',
				iconUrl: chrome.runtime.getURL('lion.png'),
				onClick: function(){
					console.log('roar');
				}
			}
		]);


		var view3 = searchResultsView.addCollapsibleSection({
			title: 'Third wheel',
			summaryText: 'click me',
			hasDropdown: true,
			onDropdownClick: function(event){
				event.dropdown.el.textContent = 'hello world';
			}
		});

		view3.setTableRows([
			{
				title: 'wheels',
				onClick: function(){
					console.log('squeeeek');
				}
			}
		]);

	});

});
