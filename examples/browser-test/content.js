'use strict';

InboxSDK.load(1, 'simple-example', {inboxBeta:true}).then(sdk => {
	sdk.Compose.registerComposeViewHandler(composeView => {
		var button = composeView.addButton({
			title: 'Monkeys!',
			iconUrl: chrome.runtime.getURL('monkey.png'),
			hasDropdown: true,
			onClick(event) {
				event.dropdown.el.innerHTML = '<div class="extension-dropdown-test">foo</div>';
			},
			section: 'TRAY_LEFT'
		});
	});
});
