var inboxSDK = new InboxSDK('compose-stream-example');

inboxSDK.Compose.registerComposeViewHandler(function(composeView){

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

	composeView.on('toAddressAdded', console.log.bind(console, 'toAddressAdded'));
	composeView.on('toAddressRemoved', console.log.bind(console, 'toAddressRemoved'));
	composeView.on('ccAddressAdded', console.log.bind(console, 'ccAddressAdded'));
	composeView.on('ccAddressRemoved', console.log.bind(console, 'ccAddressRemoved'));
	composeView.on('bccAddressAdded', console.log.bind(console, 'bccAddressAdded'));
	composeView.on('bccAddressRemoved', console.log.bind(console, 'bccAddressRemoved'));
	composeView.on('recipientsChanged', console.log.bind(console, 'recipientsChanged'));


});
