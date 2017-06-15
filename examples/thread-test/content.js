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
		})();
	});

	sdk.Conversations.registerMessageViewHandler(messageView => {
		(async () => {
			window._lastMessageView = messageView;
			console.log('messageView', messageView.getMessageID(), messageView.getBodyElement().textContent.slice(0,20));
			console.log('messageView.getViewState()', messageView.getViewState());
			['viewStateChange', 'destroy'].forEach(name => {
				messageView.on(name, event => {
					console.log('messageView', name, messageView.getBodyElement().textContent.slice(0,20), event);
				});
			});
		})();
	});
});
