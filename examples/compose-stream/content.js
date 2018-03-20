'use strict';

InboxSDK.load(2, 'compose-stream-example').then(inboxSDK => {
	window._sdk = inboxSDK;

	const fileInput = document.createElement('input');
	fileInput.type = 'file';
	fileInput.multiple = true;
	fileInput.style.display = 'none';
	document.body.appendChild(fileInput);
	window._fileInput = fileInput;

	const dataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAPCAIAAABr+ngCAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAHVJREFUeNpidNnZwkAuYGKgAFCm2VVKjwxtQF1AxARnkaQTwmBBE9r97BIx2iCAmSFAW5lXHM4HsoHo3ueXmNqQlUGsYYHbhmwqsiswfQR3HQuaEKYRWLWha8ZlBFZt2DVjGoEnCFnwhC3+kB/Y5EmJZoAAAwDdxywx4cg7qwAAAABJRU5ErkJggg==';

	window.openDraftByMessageID = function(messageID) {
		return inboxSDK.Compose.openDraftByMessageID(messageID);
	};

	inboxSDK.Compose.registerComposeViewHandler(function(composeView){
		console.log('thread id', composeView.getThreadID());

		window._lastComposeView = composeView;

		composeView.on('presending', console.log.bind(console, 'presending'));
		composeView.on('sending', console.log.bind(console, 'sending'));
		composeView.on('sent', event => {
			(async () => {
				const [threadId, messageId] = await Promise.all([event.getThreadID(), event.getMessageID()]);
				console.log(`sent, threadId=${threadId}, messageId=${messageId}`);
			})();
		});
	});
});
