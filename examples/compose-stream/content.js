var inboxSDK = new InboxSDK('compose-stream-example');

inboxSDK.Views.on('composeOpen', function(composeView){

	var monkeyImages = [chrome.runtime.getURL('monkey.png'), chrome.runtime.getURL('monkey-face.jpg')];
	var monkeyIndex = 1;

	var sinkFunction;

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

	var buttonStream = Bacon.fromBinder(function(sink){
		sinkFunction = sink;

		return function(){
			//do nothing
		};
	});

	composeView.addButton(buttonStream);

	sinkFunction(buttonOptions);
});
