InboxSDK.load(1, 'toolbar-example', {appIconUrl: chrome.runtime.getURL('monkey.png')}).then(function(inboxSDK) {
	window._sdk = inboxSDK;

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
			event.dropdown.el.textContent = 'Subject: ' + event.threadView.getSubject() + '\n' + 'Messages: ' + event.threadView.getMessageViews().length;
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


	inboxSDK.Toolbars.registerToolbarButtonForThreadView({
		iconUrl: chrome.runtime.getURL('monkey.png'),
		title: 'Monkeys 3',
		section: inboxSDK.Toolbars.SectionNames.OTHER,
		onClick: function(event){
			console.log('monkeys 3');
		}
	});

	inboxSDK.Toolbars.registerToolbarButtonForList({
		title: 'Monkeys 4',
		section: inboxSDK.Toolbars.SectionNames.OTHER,
		onClick: function(event){
			console.log('selected: ', event.selectedThreadRowViews.length);
		}
	});

	var button = inboxSDK.Toolbars.addToolbarButtonForApp({
		iconUrl: 'https://ssl.gstatic.com/s2/oz/images/notifications/spinner_32_4152eb447e3e756250b29a0b19b2bbf9.gif',
		title: 'App Monkey',
		arrowColor: 'green',
		onClick: function(event){
			console.log('app toolbar click', event);
			var div = document.createElement("div");
			div.textContent = 'Hello World!';
			div.style.backgroundColor = 'green';

			event.dropdown.el.appendChild(div);
		}
	});
	window._button = button;

	setTimeout(function(){
		button.open();
	}, 5*1000);

});
