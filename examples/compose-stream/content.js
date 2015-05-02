InboxSDK.load(1, 'compose-stream-example').then(function(inboxSDK) {

	inboxSDK.Compose.registerComposeViewHandler(function(composeView){
		console.log('thread id', composeView.getThreadID());
		console.log('message id', composeView.getMessageID());

		var monkeyImages = [chrome.runtime.getURL('monkey.png'), chrome.runtime.getURL('monkey-face.jpg')];
		var monkeyIndex = 1;

		composeView.addButton(Bacon.fromBinder(function(sinkFunction){

			var buttonOptions = {
				title: 'Monkeys!',
				iconUrl: chrome.runtime.getURL('monkey-face.jpg'),
				onClick: function(event){
					monkeyIndex = (monkeyIndex + 1)%2;
					buttonOptions.iconUrl = monkeyImages[monkeyIndex];

					sinkFunction(buttonOptions);


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
