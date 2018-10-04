function addCustomMessage(sortDate){
	const collapsedEl = document.createElement('div');
	const headerEl = document.createElement('div');
	const bodyEl = document.createElement('div');

	collapsedEl.innerHTML = 'collapsed element';
	headerEl.innerHTML = 'header element';
	bodyEl.innerHTML = 'body element';

	return window._lastThreadView.addCustomMessage({
		iconUrl: 'http://www.pvhc.net/img152/gohqnjgtktwlztooxcbj.jpg',
		collapsedEl, bodyEl, headerEl, sortDate
	});
}

InboxSDK.load(2, 'thread-example').then(sdk => {
	'use strict';

	window._sdk = sdk;

	sdk.Conversations.registerThreadViewHandler(threadView => {
		(async () => {
			window._lastThreadView = threadView;
			console.log('threadView', await threadView.getThreadIDAsync(), threadView.getSubject());
			console.log(
				'%s loaded message views, %s all message views',
				threadView.getMessageViews().length,
				threadView.getMessageViewsAll().length
			);
			threadView.on('destroy', () => {
				console.log('threadView destroy');
			});

			threadView.registerHiddenCustomMessageNoticeProvider((customHiddenCount, nativeHiddenCount) => {
				const span = document.createElement('span');
				span.innerText = 'There are ' + (customHiddenCount) + ' custom hides, and ' + 
				(nativeHiddenCount) + 'native hides.';
				console.log(span.innerText);
				return span;
			});

		})();
	});

	sdk.Conversations.registerMessageViewHandler(messageView => {
		(async () => {
			window._lastMessageView = messageView;
			console.log('messageView', await messageView.getMessageIDAsync(), messageView.getBodyElement().textContent.slice(0,20));
			console.log('messageView.getViewState()', messageView.getViewState());
			['viewStateChange', 'destroy'].forEach(name => {
				messageView.on(name, event => {
					console.log('messageView', name, messageView.getBodyElement().textContent.slice(0,20), event);
				});
			});

			messageView.getRecipientsFull().then(recipients => {
				console.log('recipients', recipients);
			});
		})();
	});
});
