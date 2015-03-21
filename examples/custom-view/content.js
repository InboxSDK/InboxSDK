function log() {
	console.log.apply(console, ['custom-view'].concat(Array.prototype.slice.call(arguments)));
}

InboxSDK.load(1.0, 'custom-view').then(function(inboxSDK){


inboxSDK.Router.handleCustomRoute('example/:monkeyName', function(customRouteView){
	customRouteView.getElement().innerHTML = 'hello world!';
});


inboxSDK.Router.handleAllRoutes(function(routeView){
	log(
		'id', routeView.getRouteID(),
		'type', routeView.getRouteType(),
		'params', routeView.getParams()
	);
});



inboxSDK.NavMenu.SENT_MAIL.addNavItem({
	name: 'Sent Monkeys'
});


inboxSDK.NavMenu.addNavItem({
	name: 'beep',
	iconUrl: chrome.runtime.getURL('monkey-face.jpg'),
	routeID: 'beep'
});

inboxSDK.Router.handleCustomRoute('beep', function(customRouteView){
	customRouteView.getElement().innerHTML = 'beep';
});

var navItem = inboxSDK.NavMenu.addNavItem({
	name: 'Monkeys',
	iconUrl: chrome.runtime.getURL('monkey-face.jpg'),
	routeID: 'example/:monkeyName',
	routeParams: 'george {} {} {}',
	type: inboxSDK.NavMenu.NavItemTypes.MANAGE,
	accessory: {
		type: 'CREATE',
		onClick: function(){
			log('create monkeys');
		}
	}
});

var lion = navItem.addNavItem({
	name: 'Lions',
	routeID: inboxSDK.Router.NativeRouteIDs.THREAD,
	routeParams: {threadID: '14aa1bcd3deefcf7'},
	iconUrl: chrome.runtime.getURL('lion.png'),
	accessory: {
		type: 'ICON_BUTTON',
		iconUrl: chrome.runtime.getURL('lion.png'),
		onClick: function(){
			log('lions rocks!');
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
