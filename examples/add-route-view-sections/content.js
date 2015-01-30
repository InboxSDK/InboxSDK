InboxSDK.load(1.0, 'route-view-sections-example').then(function(inboxSDK){

	inboxSDK.Router.handleListRoute(inboxSDK.Router.NativeRouteIDs.ANY_LIST, function(listRouteView){
		var view1 = listRouteView.addCollapsibleSection({
			title: 'Monkeys',
			subtitle: 'chunkeys'
		});

		view1.setTableRows([
			{
				title: 'title',
				body: 'body',
				shortDetailText: 'extra',
				iconUrl: chrome.runtime.getURL('monkey.png'),
				labels: [
					{
						title: 'label',
						backgroundColor: 'yellow',
						foregroundColor: 'red',
						iconUrl: chrome.runtime.getURL('monkey.png')
					}
				],
				isRead: true,
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

		var view2 = listRouteView.addCollapsibleSection({
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


		var view3 = listRouteView.addCollapsibleSection({
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


		var bus = new Bacon.Bus();
		listRouteView.addCollapsibleSection(bus);

		bus.push({
			title: 'Stream',
			subtitle: "I'm so streamy"
		});

	});

});
