InboxSDK.load(1, 'simple-example', {iconImageUrl: chrome.runtime.getURL('monkey.png')}).then(function(inboxSDK) {
	inboxSDK.Compose.registerComposeViewHandler(function(composeView){
		composeView.addButton({
			title: 'Monkeys!',
			iconUrl: chrome.runtime.getURL('monkey.png'),
			hasDropdown: true,
			onClick: function(event){
				composeView.setSubject('foo<b>ar');
				event.dropdown.el.innerHTML = 'hello world!';
			},
			section: 'TRAY_LEFT'
		});

		var s1 = composeView.addStatusBar({height:20});
		s1.el.innerHTML = 's1 foo <b>bar</b>';
		s1.on('destroy', function() {
			console.log('s1 destroyed');
		});

		composeView.addButton({
			title: 'Monkeys 2',
			iconUrl: chrome.runtime.getURL('monkey.png'),
			onClick: function(event){
				if (s1) {
					s1.destroy();
					s1 = null;
				} else {
					s1 = composeView.addStatusBar({height:20});
					s1.el.innerHTML = 's1 foo <b>bar</b>';
					s1.on('destroy', function() {
						console.log('s1 destroyed');
					});
				}
			},
			section: 'TRAY_LEFT'
		});

		var s2 = composeView.addStatusBar({orderHint:2});
		s2.el.innerHTML = 's2 foo <b>bar</b>';
		s2.on('destroy', function() {
			console.log('s2 destroyed');
		});

		composeView.addButton({
			title: 's2',
			iconUrl: chrome.runtime.getURL('monkey.png'),
			onClick: function(event){
				if (s2) {
					s2.destroy();
					s2 = null;
				} else {
					s2 = composeView.addStatusBar({orderHint:2});
					s2.el.innerHTML = 's2 foo <b>bar</b>';
					s2.on('destroy', function() {
						console.log('s2 destroyed');
					});
				}
			},
			section: 'TRAY_LEFT'
		});

		var sr;

		composeView.addButton({
			title: 'recipient row',
			iconUrl: chrome.runtime.getURL('monkey.png'),
			onClick: function(event){
				if (sr) {
					sr.destroy();
					sr = null;
				} else {
					var el = document.createElement('div');
					el.innerHTML = 'sr foo <b>bar</b>';
					sr = composeView.addRecipientRow({labelText: 'Label Text', el:el});
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
