var inboxSDK = new InboxSDK('custom-view');

inboxSDK.Router.createNewRoute({
	name: 'example',
	onActivate: function(event){
		event.el.innerHTML = 'hello world!';
	}
});

inboxSDK.Router.registerRouteViewHandler(function(routeView){
	console.log('name', routeView.getName());
	console.log('params', routeView.getParams());
});


var navItem = inboxSDK.NavMenu.addNavItem({
	name: 'Monkeys',
	iconUrl: chrome.runtime.getURL('monkey-face.jpg'),
	route: 'example'
});


var lion = navItem.addNavItem({
	name: 'Lions',
	iconUrl: chrome.runtime.getURL('lion.png')
});

var monkey = lion.addNavItem({
	name: 'Saved View',
	iconUrl: chrome.runtime.getURL('monkey.png')
});
