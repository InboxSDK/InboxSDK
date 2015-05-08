InboxSDK.load("1.0", "attachment-card-exmaple").then(function(sdk){

	sdk.Conversations.registerMessageViewHandler(function(messageView){
		console.log('got messageView', messageView.getMessageID());
		messageView.addAttachmentIcon({
			iconClass: 'eye_icon',
			tooltip: 'thing'
		});
		messageView.addAttachmentIcon(Kefir.repeat(function() {
			return Kefir.sequentially(2000, [
				{
					iconClass: 'eye_icon',
					tooltip: 'thing',
					onClick: alert.bind(window, 'foo')
				},
				{
					iconUrl: 'https://ssl.gstatic.com/ui/v1/icons/mail/gplus.png',
					tooltip: 'blah blah'
				}
			]);
		}));

		messageView.addAttachmentCardView({

			title: 'Test image',
			description: 'Test description',
			previewUrl: 'https://www.google.com',
			previewThumbnailUrl: chrome.runtime.getURL('partycat.jpg'),
			mimeType: 'image/jpg',
			buttons: [
				{
					downloadUrl: 'https://www.streak.com',
					openInNewTab: true
				}
			]

		});


		var attachmentCard = messageView.addAttachmentCardView({

			title: 'Test file',
			description: 'Test description 2',
			previewUrl: 'https://www.google.com',
			previewThumbnailUrl: chrome.runtime.getURL('partycat.jpg'),
			buttons: [
				{
					downloadUrl: 'https://www.streak.com'
				}
			]
		});


		messageView.addAttachmentCardViewNoPreview({

			title: 'Test Icon file',
			description: 'Test description icon',
			previewUrl: 'https://www.google.com',
			iconThumbnailUrl: chrome.runtime.getURL('zipicon.png'),
			buttons: [
				{
					downloadUrl: 'https://www.streak.com'
				}
			]
		});

		messageView.getFileAttachmentCardViews().map(function(card, i) {
			console.log(i, 'attachment card', card);
			console.log(i, 'type', card.getAttachmentType());
			card.getDownloadURL().then(function(url) {
				console.log(i, 'url', url);
			});
			card.addButton({
				iconUrl: chrome.runtime.getURL('zipicon.png'),
				tooltip: 'Foo',
				onClick: console.log.bind(console, 'click')
			});
			card.addButton({
				iconUrl: chrome.runtime.getURL('zipicon.png'),
				tooltip: 'Foo2',
				onClick: console.log.bind(console, 'click2')
			});
		});

	});

});
