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

	sdk.Router.handleListRoute(sdk.Router.NativeListRouteIDs.ANY_LIST, function(listRouteView) {
		window.lastListRouteView = listRouteView;
	});

	sdk.Router.handleCustomRoute('tlexample/:monkeyName', function(customRouteView){
		customRouteView.getElement().innerHTML = 'hello world!';
	});

	sdk.Router.handleCustomListRoute('tlbeep', function(page) {
		log('tlbeep activate', arguments);
		return delay(5000, [
			'<001a11c215129742ad0511fdbedb@google.com>',
			'<CAGtu8GdkoMY1kCaV4ZvxTCqsK4tqM0esU-0OrRXTaSg28Hh1gg@mail.gmail.com>',
			'<047d7bd908ee50d1d6051c089b72@google.com>',
			'<001a113678d82ec311051c08933b@google.com>',
			'<001a11c2e51ccba39c051c083e7d@google.com>',
			'<089e0158acb64cea26051c083705@google.com>',
			'<001a113f8df40096bf051c07efbe@google.com>',
			'<001a11330f2c9ccbff051c07eb3c@google.com>',
			'<089e013cc4142a1f94051c07d8c3@google.com>',
			'<94eb2c0365b8b63213051c07cfa7@google.com>',
			'<001a1133f9ca6dc66e051c0775c0@google.com>',
			'<001a11c301ba85a533051c0768cd@google.com>',
			'<089e011839927c99e8051bfe20f1@google.com>',
			'<94eb2c0928d6639f92051bfe15f2@google.com>',
			'<001a113835c624d2bb051bfe0a4b@google.com>',
			'<001a113eda3289c121051bfe0662@google.com>',
			'<047d7b15accdfc530d051bfc9a45@google.com>',
			'<001a11427abce8532b051bfc8e1c@google.com>',
			'<001a11340b9ce70c5e051bfbfd61@google.com>',
			'<001a11c327dac2b2a7051bfbf856@google.com>',
			'14ed7f99f4aa538c',
			'14ed7dad3619a4db',
			'14ed7d7702a39965',
			'14ed79a79b67fb01',
			'14ed79998801f59a',
			'14ed7600ce67788a',
			'14ed75f190f5b79c',
			'14ed6e66ed57ec52',
			'14ed6e467470859e',
			'14ed692d258578d9',
			'14ed68fc9f857a59'
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
