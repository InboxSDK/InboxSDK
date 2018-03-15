'use strict';

InboxSDK.load(1.0, 'route-view-sections-example').then(function(inboxSDK){
	window._sdk = inboxSDK;

	inboxSDK.Router.handleListRoute(inboxSDK.Router.NativeRouteIDs.ANY_LIST, function(listRouteView){
		var view1 = listRouteView.addCollapsibleSection({
			title: 'Monkeys',
			subtitle: 'chunkeys',
			hasDropdown: true,
			onDropdownClick: (event) => {
				event.dropdown.el.innerHTML = 'Hello world!';
			},
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
							iconBackgroundColor: 'green',
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
			hasDropdown: true,
			onDropdownClick: (event) => {
				event.dropdown.el.innerHTML = 'Hello world!';
			},
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

		var view3 = listRouteView.addSection({
			title: 'No Collapse!',
			contentElement: el,
			footerLinkText: "Smell my feet",
			onFooterLinkClick: console.log.bind(console, 'they stink!')
		});


		var bus = new Bacon.Bus();
		listRouteView.addCollapsibleSection(bus);

		bus.push({
			title: 'Stream',
			subtitle: "I'm so streamy"
		});

		setTimeout(function(){
			bus.push({
				title: 'Stream',
				subtitle: "I'm so stream",
				tableRows: []
			});
		}, 5000);

	});

});
