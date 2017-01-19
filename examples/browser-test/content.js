'use strict';

const script = document.createElement('script');
script.textContent = `
window._errors = [];
document.documentElement.addEventListener('inboxSDKerror', event => {
	window._errors.push(event.detail);
});
`;
document.documentElement.appendChild(script).remove();
document.documentElement.setAttribute('inboxsdk-emit-error-event', 'true');

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

	sdk.Conversations.registerThreadViewHandler(threadView => {
		const id = threadView.getThreadID();
		if (!/[0-9a-f]{12,16}/i.test(id)) {
			throw Object.assign(new Error('Bad thread id'), {id});
		}
		document.head.setAttribute(
			'data-test-threadViews-seen',
			Number(document.head.getAttribute('data-test-threadViews-seen'))+1
		);
	});

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
