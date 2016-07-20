InboxSDK.load(1, 'compose-stream-example', {inboxBeta: true}).then(function(inboxSDK) {
	'use strict';

	window._sdk = inboxSDK;

	const fileInput = document.createElement('input');
	fileInput.type = 'file';
	fileInput.style.display = 'none';
	document.body.appendChild(fileInput);
	window._fileInput = fileInput;

	window.openDraftByMessageID = function(messageID) {
		return inboxSDK.Compose.openDraftByMessageID(messageID);
	};

	inboxSDK.Compose.registerComposeViewHandler(function(composeView){
		console.log('thread id', composeView.getThreadID());

		window._lastComposeView = composeView;

		var monkeyImages = [chrome.runtime.getURL('monkey.png'), chrome.runtime.getURL('monkey-face.jpg')];
		var monkeyIndex = 0;

		composeView.addButton(Bacon.fromBinder(function(sinkFunction){

			var buttonOptions = {
				title: 'Monkeys!',
				iconUrl: monkeyImages[monkeyIndex],
				onClick: function(event){
					monkeyIndex++;
					buttonOptions.iconUrl = monkeyImages[monkeyIndex%2];
					buttonOptions.iconClass = monkeyIndex%2 ? 'special_style' : '';

					if (monkeyIndex >= 2) {
						sinkFunction(null);
						setTimeout(function() {
							sinkFunction(buttonOptions);
						}, 2000);
					} else {
						sinkFunction(buttonOptions);
					}


					var element = event.composeView.insertHTMLIntoBodyAtCursor('<b>monkey face</b>');
					element.textContent = 'monkey time';
				},
				section: 'TRAY_LEFT'
			};

			sinkFunction(buttonOptions);

			return function(){};

		}));

		composeView.addButton(Bacon.fromBinder(function(sink){
			var buttonOptions = {
				title: 'no image',
				iconClass: 'cssbutton',
				onClick: function(event) {
					buttonOptions.iconClass = buttonOptions.iconClass==='cssbutton' ? 'cssbutton afterclick' : 'cssbutton';
					sink(buttonOptions);
				}
			};
			sink(buttonOptions);
			return function(){};
		}));

		composeView.addButton({
			title: 'Lion -1',
			iconUrl: chrome.runtime.getURL('lion.png'),
			orderHint: -1,
			onClick: function(event){
				event.composeView.insertLinkIntoBodyAtCursor('monkeys', 'http://www.google.com');
			}
		});

		composeView.addButton({
			title: 'text',
			iconUrl: chrome.runtime.getURL('lion.png'),
			onClick: function(event){
				event.composeView.insertTextIntoBodyAtCursor('<b>the xss guy\nfoo bar\nbar foo');
			}
		});

		composeView.addButton({
			title: 'link chip',
			iconUrl: chrome.runtime.getURL('lion.png'),
			onClick: function(event){
				event.composeView.insertLinkChipIntoBodyAtCursor('name', 'https://rpominov.github.io/kefir/', "https://cf.dropboxstatic.com/static/images/gmail_attachment_logo.png");
			}
		});

		const dataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAPCAIAAABr+ngCAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAHVJREFUeNpidNnZwkAuYGKgAFCm2VVKjwxtQF1AxARnkaQTwmBBE9r97BIx2iCAmSFAW5lXHM4HsoHo3ueXmNqQlUGsYYHbhmwqsiswfQR3HQuaEKYRWLWha8ZlBFZt2DVjGoEnCFnwhC3+kB/Y5EmJZoAAAwDdxywx4cg7qwAAAABJRU5ErkJggg==';

		function dataURItoBlob(dataURI) {
			// convert base64/URLEncoded data component to raw binary data held in a string
			var byteString;
			if (dataURI.split(',')[0].indexOf('base64') >= 0)
				byteString = atob(dataURI.split(',')[1]);
			else
				byteString = unescape(dataURI.split(',')[1]);
			// separate out the mime component
			var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
			// write the bytes of the string to a typed array
			var ia = new Uint8Array(byteString.length);
			for (var i = 0; i < byteString.length; i++) {
				ia[i] = byteString.charCodeAt(i);
			}
			return new Blob([ia], {type:mimeString});
		}

		composeView.addButton({
			title: 'Attach image',
			iconUrl: dataUri,
			onClick(event) {
				fileInput.value = '';
				fileInput.click();
			},
			section: 'SEND_RIGHT'
		});

		Bacon.fromEventTarget(fileInput, 'change')
			.takeUntil(Bacon.fromEventTarget(composeView, 'destroy'))
			.onValue(() => {
				if (fileInput.files.length) {
					composeView.attachInlineFiles(fileInput.files);
				}
			});

		composeView.addButton({
			title: 'Changer',
			iconUrl: chrome.runtime.getURL('lion.png'),
			onClick: function(event){
				composeView.setToRecipients(['to@example.com', 'to2@example.com']);
				composeView.setCcRecipients(['cc@example.com', 'cc2@example.com']);
				composeView.setBccRecipients(['bcc@example.com', 'bcc2@example.com']);

				console.log('current from was', composeView.getFromContact());
				var choices = composeView.getFromContactChoices();
				console.log('all from choices were', choices);
				composeView.setFromEmail(choices[choices.length-1].emailAddress);
				console.log('new from is', composeView.getFromContact());
			},
			section: 'SEND_RIGHT'
		});

		composeView.on('destroy', console.log.bind(console, 'destroy'));
		composeView.on('destroy', function() {
			composeView.getDraftID().then(function(draftID) {
				console.log('destroyed, draftID =', draftID);
			});
		});
		composeView.on('presending', console.log.bind(console, 'presending'));
		composeView.on('sending', console.log.bind(console, 'sending'));
		composeView.on('sent', console.log.bind(console, 'sent'));
		composeView.on('sendCanceled', console.log.bind(console, 'sendCanceled'));

		composeView.on('toContactAdded', console.log.bind(console, 'toContactAdded'));
		composeView.on('toContactRemoved', console.log.bind(console, 'toContactRemoved'));
		composeView.on('ccContactAdded', console.log.bind(console, 'ccContactAdded'));
		composeView.on('ccContactRemoved', console.log.bind(console, 'ccContactRemoved'));
		composeView.on('bccContactAdded', console.log.bind(console, 'bccContactAdded'));
		composeView.on('bccContactRemoved', console.log.bind(console, 'bccContactRemoved'));
		composeView.on('recipientsChanged', console.log.bind(console, 'recipientsChanged'));
		composeView.on('fromContactChanged', console.log.bind(console, 'fromContactChanged'));

		composeView.on('fullscreenChanged', console.log.bind(console, 'fullscreenChanged'));
	});

	var button = inboxSDK.Toolbars.addToolbarButtonForApp({
		iconUrl: 'https://ssl.gstatic.com/s2/oz/images/notifications/spinner_32_4152eb447e3e756250b29a0b19b2bbf9.gif',
		title: 'App Monkey',
		arrowColor: 'green',
		onClick(event){
			console.log('app toolbar click', event);
			var div = document.createElement("div");
			div.textContent = 'Hello World! Foo bar 1234567 filler text is here. Foo bar 1234567 filler text is here. Foo bar 1234567 filler text is here. Foo bar 1234567 filler text is here. Foo bar 1234567 filler text is here. Foo bar 1234567 filler text is here. Foo bar 1234567 filler text is here. Foo bar 1234567 filler text is here. Foo bar 1234567 filler text is here. Foo bar 1234567 filler text is here. Foo bar 1234567 filler text is here. Foo bar 1234567 filler text is here. Foo bar 1234567 filler text is here. Foo bar 1234567 filler text is here.';
			div.style.backgroundColor = 'green';

			event.dropdown.el.appendChild(div);
		}
	});
	window._button = button;
});
