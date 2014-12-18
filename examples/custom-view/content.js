var inboxSDK = new InboxSDK('custom-view');

inboxSDK.Router.registerCustom({
	name: 'example',
	onActivate: function(event){
		event.el.innerHTML = 'hello world!';
	}
});

inboxSDK.Router.registerRouteViewHandler(function(view){
	console.log('name', view.getName());
	console.log('params', view.getParams());
});

var unsub = inboxSDK.Router.registerRouteViewHandler(function(view){
	unsub();
	inboxSDK.Router.gotoView('example');
});
