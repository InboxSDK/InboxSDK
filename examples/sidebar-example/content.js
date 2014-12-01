var inboxSDK = new InboxSDK('sidebar-example');

inboxSDK.Conversations.registerThreadViewHandler(function(threadView){

	var el = document.createElement("div");
	el.innerHTML = 'Hello world!';

	var contentPanel = threadView.addSidebarContentPanel({
		title: 'Monkey',
		iconUrl: chrome.runtime.getURL('monkey-face.jpg'),
		el: el
	});

	var el2 = document.createElement('div');
	el2.innerHTML = 'Hellow back!';

	threadView.addSidebarContentPanel({
		title: 'Monkey 2',
		iconUrl: chrome.runtime.getURL('monkey.png'),
		el: el2
	});

	setTimeout(function(){		
		contentPanel.remove();
	}, 10*1000);

});
