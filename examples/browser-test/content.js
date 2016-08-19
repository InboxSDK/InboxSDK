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

	const arrowIconUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAAVCAYAAACpF6WWAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAYElEQVQ4y+2UMQ6AQAgEwfhQnnJP4adjc4UxB0ehhXqbULE7BRAUkLu1yQP6OXQveEab1DXTD0O9b53kIui+QReicnJ5lM2gArQA2LLcDCqAXYA2y1SgZ7BV/Lr+6TugB0K2GxxDXjEZAAAAAElFTkSuQmCC';

	sdk.Conversations.registerMessageViewHandler(messageView => {
		messageView.getFileAttachmentCardViews().forEach(cardView => {
			cardView.addButton({
				iconUrl: arrowIconUrl,
				tooltip: 'MV'
			});
		});
	});

	sdk.Conversations.registerFileAttachmentCardViewHandler(cardView => {
		cardView.addButton({
			iconUrl: arrowIconUrl,
			tooltip: 'CV'
		});
	});
});
