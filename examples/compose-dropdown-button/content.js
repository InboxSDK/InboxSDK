var inboxSDK = new InboxSDK('simple-example');

inboxSDK.Views.on('composeOpen', function(composeView){
	composeView.addButton({
		title: 'Monkeys!',
		iconUrl: chrome.runtime.getURL('monkey.png'),
		hasDropdown: true,
		onClick: function(event){
			event.dropdown.el.innerHTML = 'hello world!';
		},
		section: 'TRAY_LEFT'
	});

});
