InboxSDK.load(1, 'simple-example', {iconImageUrl: chrome.runtime.getURL('monkey.png')}).then(function(inboxSDK) {
	inboxSDK.Compose.registerComposeViewHandler(function(composeView){
		var statusbar = composeView.addStatusBar();
		statusbar.el.innerHTML = 'foo <b>bar</b>';
		statusbar.on('destroy', function() {
			console.log('statusbar destroyed');
		});

		composeView.addButton({
			title: 'Monkeys!',
			iconUrl: chrome.runtime.getURL('monkey.png'),
			hasDropdown: true,
			onClick: function(event){
				event.dropdown.el.innerHTML = 'hello world!';
			},
			section: 'TRAY_LEFT'
		});

		composeView.addButton({
			title: 'Monkeys 2',
			iconUrl: chrome.runtime.getURL('monkey.png'),
			onClick: function(event){
				if (statusbar) {
					statusbar.destroy();
					statusbar = null;
				} else {
					statusbar = composeView.addStatusBar({height:20});
					statusbar.el.innerHTML = 'foo <b>bar</b>';
					statusbar.on('destroy', function() {
						console.log('statusbar destroyed');
					});
				}
			},
			section: 'TRAY_LEFT'
		});

		composeView.on('presending', function(event){
			console.log('presending', event);
			event.cancel();
		});

		composeView.on('destroy', console.log.bind(console, 'destroyed'));

	});
});
