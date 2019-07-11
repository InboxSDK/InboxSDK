function kefirStopper() {
  var emitter = null;

  function end() {
    stopper.stopped = true;

    if (emitter) {
      emitter.emit(null);
      emitter.end();
    }
  }

  var stream = Kefir.stream(function (_emitter) {
    emitter = _emitter;

    if (stopper.stopped) {
      end();
    }
  });
  var stopper = stream.toProperty();
  stopper.stopped = false;
  stopper.destroy = end;
  return stopper;
}

InboxSDK.load(2, "attachment-card-exmaple").then(function(sdk){
	'use strict';

  window._sdk = sdk;

	sdk.Conversations.registerFileAttachmentCardViewHandler(card => {
		card.addButton({
			iconUrl: chrome.runtime.getURL('zipicon.png'),
			tooltip: 'Foo1',
			onClick(event) {
				console.log('click', event);
				event.getDownloadURL().then(url => {
					console.log('download url', url);
				});
			}
		});
	});

	const dataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAPCAIAAABr+ngCAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAHVJREFUeNpidNnZwkAuYGKgAFCm2VVKjwxtQF1AxARnkaQTwmBBE9r97BIx2iCAmSFAW5lXHM4HsoHo3ueXmNqQlUGsYYHbhmwqsiswfQR3HQuaEKYRWLWha8ZlBFZt2DVjGoEnCFnwhC3+kB/Y5EmJZoAAAwDdxywx4cg7qwAAAABJRU5ErkJggg==';

	sdk.Conversations.registerMessageViewHandler(function(messageView){
    console.log('got messageView', messageView.getMessageID());
    window._messageView = messageView;

		messageView.addAttachmentCardView({

			title: 'Test image long title testing test foobar123456',
			description: 'Test description',
			previewUrl: 'https://www.google.com',
			previewThumbnailUrl: chrome.runtime.getURL('partycat.jpg'),
			failoverPreviewIconUrl: chrome.runtime.getURL('partycat.jpg'),
			fileIconImageUrl: chrome.runtime.getURL('zipicon.png'),
			mimeType: 'image/jpg',
			previewOnClick() {
				alert('preview button clicked');
			},
			buttons: [
				{
					downloadUrl: dataUri,
					downloadFilename: 'foo.png',
					openInNewTab: true
				},
				{
					iconUrl: chrome.runtime.getURL('zipicon.png'),
					tooltip: 'Foo bar1',
					onClick() {
						alert('Foo bar button clicked');
					}
				},
				{
					iconUrl: chrome.runtime.getURL('zipicon.png'),
					tooltip: 'Foo bar2',
					onClick() {
						alert('Foo bar button clicked');
					}
				},
				{
					iconUrl: chrome.runtime.getURL('zipicon.png'),
					tooltip: 'Foo bar3',
					onClick() {
						alert('Foo bar button clicked');
					}
				}
			]

		});


		var attachmentCard = messageView.addAttachmentCardView({

			title: 'Test file',
			description: 'Test description 2',
			previewUrl: 'https://www.google.com',
			previewThumbnailUrl: chrome.runtime.getURL('partycat.jpg'),
			fileIconImageUrl: chrome.runtime.getURL('zipicon.png'),
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
			fileIconImageUrl: chrome.runtime.getURL('zipicon.png'),
			buttons: [
				{
					downloadUrl: 'https://www.streak.com'
				}
			]
		});

		messageView.getFileAttachmentCardViews().forEach(function(card, i) {
			console.log(i, 'attachment card', card);
			console.log(i, 'type', card.getAttachmentType());
			console.log(i, 'title', card.getTitle());
			card.addButton({
				iconUrl: chrome.runtime.getURL('zipicon.png'),
				tooltip: 'Foo2',
				onClick(event) {
					console.log('click2', event);
					card.getDownloadURL().then(url => {
						console.log('old, url', url);
					});
					event.getDownloadURL().then(url => {
						console.log('new, url', url);
					});
				}
			});
		});

		messageView.addAttachmentsToolbarButton({
			tooltip: 'Tooltip here',
			iconUrl: 'https://www.streak.com/build/images/circle_exclamation_mark.png',
			onClick(event) {
				const attachmentCardViews = event.attachmentCardViews;
				console.log('attachment cards', attachmentCardViews);
				for (let card of attachmentCardViews) {
					console.log('card type', card.getAttachmentType());
					console.log('card title', card.getTitle());
					card.getDownloadURL().then(url => {
						console.log('card url', url);
					}, err => console.error(err));
				}
			}
		});

		messageView.addAttachmentIcon({
			iconClass: 'eye_icon',
			tooltip: '1thing'
    });

    messageView.addAttachmentIcon({
      iconHtml: '<div>x</div>',
      iconClass: 'test-custom-class',
      tooltip: 'custom icon html',
      onClick: alert.bind(window, 'bar')
    });

    const tooltip1 = document.createElement('div');

    function Test() {
      return React.createElement("div", null, "testse ", React.createElement("br", null), React.createElement("button", {
        style: {
          width: '200px',
          height: '400px',
          background: 'aquamarine'
        },
        onClick: event => {
          event.stopPropagation();
          console.log('===== click button event', event.target);
          event.target.innerHTML = 'clicked me'
        }
      }, "click me"));
    }

    ReactDOM.render(React.createElement(Test, null), tooltip1);

    const tooltip2 = document.createElement('div');
    tooltip2.innerHTML = 'ballfjsdkljf';

    messageView.addAttachmentIcon({
      iconHtml: '<div>x</div>',
      iconClass: 'test-custom-tooltip',
      tooltip: tooltip1,
      onClick: () => {console.log('click on icon html')}
    });

    const tooltip3 = document.createElement('div');
    tooltip3.innerHTML = 'fsjdfjskdlf';
    tooltip3.onclick = function (event) {
      event.stopPropagation();
      console.log('click on tooltip')
    }

    messageView.addAttachmentIcon({
      iconHtml: '<div>Q</div>',
      iconClass: 'test-custom-tooltip',
      tooltip: tooltip3
    });

    const stopper = kefirStopper();

    messageView.addAttachmentIcon(Kefir.constant({
      iconHtml: '<div>y</div>',
      iconClass: 'test-remove-icon',
      tooltip: 'custom icon html',
      onClick: alert.bind(window, 'bar')
    }).merge(stopper.map(() => null)));

    setTimeout(() => {
      stopper.destroy();
      console.log('destroy')
    }, 5000);

		messageView.addAttachmentIcon(Kefir.repeat(function() {
			return Kefir.sequentially(2000, [
				{
					iconClass: 'eye_icon',
					tooltip: '2thing',
					onClick: alert.bind(window, 'foo')
				},
				{
					iconUrl: 'https://ssl.gstatic.com/ui/v1/icons/mail/gplus.png',
					tooltip: '2blah blah'
        },
        {
          iconHtml: '<div>x</div>',
          tooltip: 'custom icon html'
        },
        {
          iconHtml: '<div>x</div>',
          iconClass: 'test-custom-tooltip',
          tooltip: tooltip2,
          onClick: alert.bind(window, 'bar')
        }
			]);
		}));
	});

});
