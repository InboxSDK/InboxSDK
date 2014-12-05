var inboxSDK = new InboxSDK('sidebar-example');

inboxSDK.Conversations.registerThreadViewHandler(function(threadView){

	var el = document.createElement("div");
	el.innerHTML = 'Hello world!';

	threadView.addSidebarContentPanel({
		title: 'Monkey',
		iconUrl: chrome.runtime.getURL('monkey-face.jpg'),
		el: el,
		orderHint: 2
	});


	var monkeyImages = [chrome.runtime.getURL('monkey.png'), chrome.runtime.getURL('monkey-face.jpg')];
	var monkeyIndex = 1;

	var el2 = document.createElement('div');
	el2.innerHTML = 'Hellow back!';

	var options = {
		title: 'Monkey 2',
		iconUrl: monkeyImages[monkeyIndex],
		el: el2,
		orderHint: 1
	};

	var stream = new Bacon.Bus();
	var contentPanel = threadView.addSidebarContentPanel(stream);

	stream.push(options);


	contentPanel.on('activate', function(){
		monkeyIndex = (monkeyIndex + 1)%2;
		options.iconUrl = monkeyImages[monkeyIndex];
		stream.push(options);
	});

	contentPanel.on('unload', function(){
		console.log('unload');
	});

});
