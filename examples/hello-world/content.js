var inboxSDK = new InboxSDK('simple-example');

inboxSDK.Views.on('composeOpen', function(composeView){

	console.log('compose view', composeView);
});

inboxSDK.Util.track("script started track this", {d:1,e:"abc track"});
inboxSDK.Util.logError("script started log error this", {d:2,e:"abc err"});

