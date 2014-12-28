InboxSDK.load(1.0, 'custom-view').then(function(inboxSDK){


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



inboxSDK.NavMenu.SENT_MAIL.addNavItem({
	name: 'Sent Monkeys'
});


var navItem = inboxSDK.NavMenu.addNavItem({
	name: 'Monkeys',
	iconUrl: chrome.runtime.getURL('monkey-face.jpg'),
	route: 'example',
	accessory: {
		type: 'CREATE',
		onClick: function(){
			console.log('create monkeys');
		}
	}
});

var lion = navItem.addNavItem({
	name: 'Lions',
	iconUrl: chrome.runtime.getURL('lion.png'),
	accessory: {
		type: 'ICON_BUTTON',
		iconUrl: chrome.runtime.getURL('lion.png'),
		onClick: function(){
			console.log('lions rocks!');
		}
	}
});

var monkey = lion.addNavItem({
	name: 'Saved View',
	iconUrl: chrome.runtime.getURL('monkey.png'),
	accessory: {
		type: 'DROPDOWN_BUTTON',
		onClick: function(event){
			event.dropdown.el.innerHTML = 'Hello world!';
		}
	}
});

inboxSDK.NavMenu.addNavItem({
	name: 'Saved View 2',
	orderHint: -1,
	accessory: {
		type: 'DROPDOWN_BUTTON',
		onClick: function(event){
			event.dropdown.el.innerHTML = 'Hello world!';
		}
	}
});


lion.addNavItem({
	name: 'aved View 2'
});


});
