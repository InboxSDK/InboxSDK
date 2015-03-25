function log() {
	console.log.apply(console, ['custom-thread-list'].concat(Array.prototype.slice.call(arguments)));
}

function delay(time, value) {
  return new Promise(function(resolve, reject) {
    setTimeout(resolve.bind(null, value), time);
  });
}

InboxSDK.load(1, 'custom-thread-list').then(function(sdk) {
	window._sdk = sdk;

	sdk.Router.handleAllRoutes(function(routeView){
		log(
			'id', routeView.getRouteID(),
			'type', routeView.getRouteType(),
			'params', routeView.getParams()
		);
	});

	sdk.Router.handleCustomRoute('tlexample/:monkeyName', function(customRouteView){
		customRouteView.getElement().innerHTML = 'hello world!';
	});

	sdk.Router.handleCustomListRoute('tlbeep', function(page) {
		log('tlbeep activate', arguments);
		return delay(50, [
			'<001a11c215129742ad0511fdbedb@google.com>',
			'<CAGtu8GdkoMY1kCaV4ZvxTCqsK4tqM0esU-0OrRXTaSg28Hh1gg@mail.gmail.com>'
		]);
	});

	sdk.Lists.registerThreadRowViewHandler(function(threadRowView) {
		var routeID = sdk.Router.getCurrentRouteView().getRouteID();
		log(routeID);
		if (routeID === 'tlbeep') {
			threadRowView.replaceDate({
				text: Math.random() > 0.5 ? 'Returning in: 6 months' : 'aaa',
				textColor: 'green',
				title: 'tlbeep'
			});
			threadRowView.addLabel({
				title: 'aaa'
			});
		}
	});

	var customNavItem = sdk.NavMenu.addNavItem({
		name: 'TL Custom View',
		iconUrl: chrome.runtime.getURL('monkey-face.jpg'),
		routeID: 'tlexample/:monkeyName',
		routeParams: {monkeyName: 'george {} {} {}'},
	});

	var listNavItem = sdk.NavMenu.addNavItem({
		name: 'TL Custom List',
		iconUrl: chrome.runtime.getURL('monkey-face.jpg'),
		routeID: 'tlbeep',
	});
});
