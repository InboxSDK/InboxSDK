InboxSDK.load(1, 'simple-example', {
	iconImageUrl: chrome.runtime.getURL('monkey.png'),
	inboxBeta: true
}).then(function(inboxSDK) {
	window._sdk = inboxSDK;

	inboxSDK.Compose.registerComposeViewHandler(function(composeView){
		window._cv = composeView;

		composeView.addButton({
			title: 'wow',
			iconClass: 'send_modifier_icon',
			type: 'SEND_ACTION',
			hasDropdown: true,
			onClick(event) {
				event.dropdown.el.textContent = 'very dropdown';
			}
		});

		composeView.addButton({
			title: 'Monkeys!',
			iconUrl: chrome.runtime.getURL('monkey.png'),
			hasDropdown: true,
			onClick: function(event){
				if (!composeView.isInlineReplyForm() || document.location.origin !== 'https://inbox.google.com') {
					composeView.setSubject('foo<b>ar');
				}
				event.dropdown.el.textContent = 'hello world!';
			}
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
			}
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
			}
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
			}
		});

		composeView.on('presending', function(event){
			console.log('presending', event);
			event.cancel();
		});

		composeView.on('destroy', console.log.bind(console, 'destroyed'));

	});
});
