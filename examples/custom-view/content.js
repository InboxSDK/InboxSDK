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

inboxSDK.ready().then(function(){

	inboxSDK.FullscreenViews.getDescriptor('example').gotoView();

});
