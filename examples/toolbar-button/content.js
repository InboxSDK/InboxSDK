InboxSDK.load(1, 'toolbar-example').then(function(inboxSDK) {

	inboxSDK.Toolbars.registerToolbarButtonForThreadView({
		iconUrl: chrome.runtime.getURL('monkey.png'),
		title: 'Monkeys',
		section: inboxSDK.Toolbars.SectionNames.MOVE,
		hasDropdown: true,
		onClick: function(event){
			event.dropdown.el.innerHTML = 'Subject: ' + event.threadView.getSubject() + '\n' + 'Messages: ' + event.threadView.getMessageViews().length;
		}
	});


	inboxSDK.Toolbars.registerToolbarButtonForList({
		iconUrl: chrome.runtime.getURL('monkey.png'),
		title: 'Monkeys 2',
		section: inboxSDK.Toolbars.SectionNames.ARCHIVE,
		hideFor: function(routeView){
			return routeView.getRouteID() === inboxSDK.Router.NativeListRouteIDs.DRAFTS;
		},
		onClick: function(event){
			event.selectedThreadRowViews.forEach(function(threadRowView){
				threadRowView.getContacts().forEach(function(contact){
					threadRowView.addLabel({
						title: contact.emailAddress
					});
				});
			});
		}
	});

});
