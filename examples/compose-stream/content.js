InboxSDK.load(1, 'compose-stream-example').then(function(inboxSDK) {

	inboxSDK.Compose.registerComposeViewHandler(function(composeView){
		console.log('thread id', composeView.getThreadID());
		console.log('message id', composeView.getMessageID());

		var monkeyImages = [chrome.runtime.getURL('monkey.png'), chrome.runtime.getURL('monkey-face.jpg')];
		var monkeyIndex = 0;

		composeView.addButton(Bacon.fromBinder(function(sinkFunction){

			var buttonOptions = {
				title: 'Monkeys!',
				iconUrl: monkeyImages[monkeyIndex],
				onClick: function(event){
					monkeyIndex++;
					buttonOptions.iconUrl = monkeyImages[monkeyIndex%2];

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

		composeView.addButton({
			title: 'Lion',
			iconUrl: chrome.runtime.getURL('lion.png'),
			onClick: function(event){
				event.composeView.insertLinkIntoBodyAtCursor('monkeys', 'http://www.google.com');
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

		composeView.on('messageIDChange', console.log.bind(console, 'messageIDChange'));
		composeView.on('destroy', console.log.bind(console, 'destroy'));
		composeView.on('presending', console.log.bind(console, 'presending'));
		composeView.on('sending', console.log.bind(console, 'sending'));
		composeView.on('sent', console.log.bind(console, 'sent'));

		composeView.on('toContactAdded', console.log.bind(console, 'toContactAdded'));
		composeView.on('toContactRemoved', console.log.bind(console, 'toContactRemoved'));
		composeView.on('ccContactAdded', console.log.bind(console, 'ccContactAdded'));
		composeView.on('ccContactRemoved', console.log.bind(console, 'ccContactRemoved'));
		composeView.on('bccContactAdded', console.log.bind(console, 'bccContactAdded'));
		composeView.on('bccContactRemoved', console.log.bind(console, 'bccContactRemoved'));
		composeView.on('recipientsChanged', console.log.bind(console, 'recipientsChanged'));


	});
});
