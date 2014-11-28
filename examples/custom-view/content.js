var inboxSDK = new InboxSDK('custom-view');

inboxSDK.FullscreenViews.registerCustom({
	name: 'example',
	onActivate: function(event){
		event.el.innerHTML = 'hello world!';
	}
});

inboxSDK.FullscreenViews.on('change', function(event){
	console.log('name', event.view.getDescriptor().getName());
	console.log('params', event.view.getParams());
});

inboxSDK.FullscreenViews.once('change', function(event){
	inboxSDK.FullscreenViews.getDescriptor('example').gotoView();
});
