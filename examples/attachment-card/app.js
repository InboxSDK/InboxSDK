InboxSDK.load("1.0", "attachment-card-exmaple").then(function(sdk){

	sdk.Conversations.registerMessageViewHandler(function(messageView){

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

	});

});
