InboxSDK.load(1, 'toolbar-example').then(function(inboxSDK) {

	var shortcutHandle = inboxSDK.Keyboard.createShortcutHandle({
		chord: 'w b',
		description: 'have fun'
	});

	inboxSDK.Toolbars.registerToolbarButtonForThreadView({
		iconUrl: chrome.runtime.getURL('monkey.png'),
		title: 'Monkeys',
		section: inboxSDK.Toolbars.SectionNames.METADATA_STATE,
		hasDropdown: true,
		onClick: function(event){
			event.dropdown.el.innerHTML = 'Subject: ' + event.threadView.getSubject() + '\n' + 'Messages: ' + event.threadView.getMessageViews().length;
		},
		keyboardShortcutHandle: shortcutHandle
	});


	var shortcutHandle2 = inboxSDK.Keyboard.createShortcutHandle({
		chord: 'ctrl+shift+x',
		description: 'Live large'
	});

	inboxSDK.Toolbars.registerToolbarButtonForList({
		iconUrl: chrome.runtime.getURL('monkey.png'),
		title: 'Monkeys 2',
		section: inboxSDK.Toolbars.SectionNames.INBOX_STATE,
		keyboardShortcutHandle: shortcutHandle2,
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
