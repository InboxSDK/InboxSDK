InboxSDK.load(1.0, 'route-view-sections-example').then(function(inboxSDK){

	inboxSDK.Router.handleListRoute(inboxSDK.Router.NativeRouteIDs.ANY_LIST, function(listRouteView){
		var view1 = listRouteView.addCollapsibleSection({
			title: 'Monkeys',
			subtitle: 'chunkeys',
			tableRows: [
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
			]
		});


		var view2 = listRouteView.addCollapsibleSection({
			title: 'Lions',
			subtitle: 'lions',
			titleLinkText: 'click me',
			onTitleLinkClick: function(){
				console.log('clicked!');
			},
			tableRows: [
				{
					title: 'lion title',
					body: 'lion body',
					shortDetailText: 'extra',
					iconUrl: chrome.runtime.getURL('lion.png'),
					onClick: function(){
						console.log('roar');
					}
				}
			]
		});


		var el = document.createElement("div");
		el.innerHTML = 'Hello World';

		var view3 = listRouteView.addCollapsibleSection({
			title: 'Third wheel',
			titleLinkText: 'click me',
			hasDropdown: true,
			onDropdownClick: function(event){
				event.dropdown.el.textContent = 'hello world';
			},
			contentElement: el
		});


		var bus = new Bacon.Bus();
		listRouteView.addCollapsibleSection(bus);

		bus.push({
			title: 'Stream',
			subtitle: "I'm so streamy"
		});

	});

});
