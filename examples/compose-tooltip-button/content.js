InboxSDK.load(1, 'simple-example').then(function(inboxSDK) {
	inboxSDK.Compose.registerComposeViewHandler(function(composeView){
		var button = composeView.addButton({
			title: 'Monkeys!',
			iconUrl: chrome.runtime.getURL('monkey.png'),
			hasDropdown: true,
			onClick: function(event){
				event.dropdown.el.innerHTML = 'hello world!';
			},
			section: 'TRAY_LEFT'
		});

		button.showTooltip({
			title: 'Monkeys Rule!',
			subtitle: 'the jungle'
		});

		composeView.addButton({
			title: 'Monkeys 2',
			iconUrl: chrome.runtime.getURL('monkey.png'),
			onClick: function(event){
			},
			section: 'TRAY_LEFT'
		});

	});
});
