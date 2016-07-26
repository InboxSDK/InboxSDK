InboxSDK.load(1, 'thread-example', {inboxBeta: true}).then(sdk => {
	'use strict';

	window._sdk = sdk;

	sdk.Conversations.registerThreadViewHandler(threadView => {
		window._lastThreadView = threadView;
		console.log('threadView', threadView.getSubject());
		console.log(
			'%s loaded message views, %s all message views',
			threadView.getMessageViews().length,
			threadView.getMessageViewsAll().length
		);
		threadView.on('destroy', () => {
			console.log('threadView destroy');
		});
	});

	sdk.Conversations.registerMessageViewHandler(messageView => {
		window._lastMessageView = messageView;
		console.log('messageView', messageView.getBodyElement().textContent.slice(0,30));
		messageView.on('destroy', () => {
			console.log('messageView destroy', messageView.getBodyElement().textContent.slice(0,30));
		});
	});
});
