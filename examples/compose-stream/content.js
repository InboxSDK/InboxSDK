var inboxSDK = new InboxSDK('compose-stream-example');

inboxSDK.Views.on('composeOpen', function(composeView){

	var monkeyImages = [chrome.runtime.getURL('monkey.png'), chrome.runtime.getURL('monkey-face.jpg')];
	var monkeyIndex = 1;

	composeView.addButton(Bacon.fromBinder(function(sinkFunction){

		var buttonOptions = {
			title: 'Monkeys!',
			iconUrl: chrome.runtime.getURL('monkey-face.jpg'),
			onClick: function(){
				monkeyIndex = (monkeyIndex + 1)%2;
				buttonOptions.iconUrl = monkeyImages[monkeyIndex];

				sinkFunction(buttonOptions);
			},
			section: 'TRAY_LEFT'
		};

		sinkFunction(buttonOptions);

		return function(){};

	}));

	composeView.addButton({
		title: 'Lion',
		iconUrl: chrome.runtime.getURL('lion.png'),
		onClick: function(){
			alert('lions!');
		},
		section: 'SEND_RIGHT'
	});

});
