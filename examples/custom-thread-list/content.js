function log() {
	console.log.apply(console, ['custom-thread-list'].concat(Array.prototype.slice.call(arguments)));
}

function delay(time, value) {
  return new Promise(function(resolve, reject) {
    setTimeout(resolve.bind(null, value), time);
  });
}

InboxSDK.load(1, 'custom-thread-list').then(function(sdk) {
	console.log('current routeview', sdk.Router.getCurrentRouteView());
});

InboxSDK.load(1, 'custom-thread-list').then(function(sdk) {
	window._sdk = sdk;

	sdk.Router.handleAllRoutes(function(routeView){
		log(
			'handleAllRoutes',
			'id', routeView.getRouteID(),
			'type', routeView.getRouteType(),
			'params', routeView.getParams()
		);
	});

	sdk.Router.handleListRoute(sdk.Router.NativeListRouteIDs.ANY_LIST, function(listRouteView) {
		window.lastListRouteView = listRouteView;
	});

	sdk.Router.handleCustomRoute('text', function(customRouteView){
		const el = document.createElement('span');
		el.textContent = 'tlexample';
		el.style.textDecoration = 'underline';
		el.style.color = 'blue';
		el.onclick = function() {
			sdk.Router.goto('tlexample/:monkeyName', {monkeyName: 'bar'});
		};
		customRouteView.getElement().appendChild(el);
	});

	sdk.Router.handleCustomRoute('tlexample/:monkeyName', function(customRouteView){
		customRouteView.getElement().innerHTML = 'hello world!' +
			'<br><a href="#inbox/1509087e25de0fbc">thing</a>' +
			'<br>foo<br>bar' +
			'<br>foo<br>bar' +
			'<br>foo<br>bar' +
			'<br>foo<br>bar' +
			'<br>foo<br>bar' +
			'<br>foo<br>bar' +
			'<br>foo<br>bar' +
			'<br>foo<br>bar' +
			'<br>foo<br>bar' +
			'<br>foo<br>bar' +
			'<br>foo<br>bar' +
			'<br>foo<br>bar' +
			'<br>foo<br>bar' +
			'<br>foo<br>bar' +
			'<br>foo<br>bar' +
			'<br>foo<br>bar' +
			'<br>foo<br>bar' +
			'<br>foo<br>bar' +
			'<br>foo<br>bar' +
			'<br>foo<br>bar' +
			'<br>foo<br>bar' +
			'<br>foo<br>bar' +
			'<br>foo<br>bar' +
			'<br>foo<br>bar' +
			'<br>foo<br>bar' +
			'<br>foo<br>bar' +
			'<br>foo<br>bar' +
			'<br>foo<br>bar' +
			'<br>foo<br>bar' +
			'<br>foo<br>bar' +
			'<br>foo<br>bar' +
			'<br>foo<br>bar' +
			'<br>foo<br>bar' +
			'<br>foo<br>bar' +
			'<br>foo<br>bar' +
			'<br>foo<br>bar' +
			'<br>foo<br>bar' +
			'<br>foo<br>bar' +
			'<br>foo<br>bar' +
			'<br>foo<br>bar' +
			'<br>foo<br>bar' +
			'<br>foo<br>bar' +
			'<br>foo<br>bar' +
			'<br>foo<br>bar' +
			'<br>foo<br>bar' +
			'<br>foo<br>bar' +
			'<br>foo<br>bar' +
			'<br>foo<br>bar' +
			'<br>foo<br>bar' +
			'<br>foo<br>bar' +
			'<br>foo<br>bar' +
			'<br>foo<br>bar' +
			'<br>foo<br>bar' +
			'<br>foo<br>bar' +
			'<br>foo<br>bar<br>END';
	});

	const customListThreads = [
		'<CAGNQ5Q=0PfRksEgcz-kfgo41BgY4F=3ccPoAp3ERPZhhiA_cKw@mail.gmail.com>',
		'<2666328789625116864@messageid.cloud_prod.monitoring-cloud.google.com>',
		'<CA+jPuQ-=vTFHW_2+mkzYRKqrhWCVhHtR30_cjbJSgL2SYSdp7A@mail.gmail.com>',
		// '15a67bc14fa7cf22',
		// '15a6779548b80de6',
		// '15a6736f08e9489d',
		// '15a673d2791c478d',
		// '15a62ad1b0327eee',
		// '15a61c86123fa1de',
		// '15a672a7351c13f8',
		// '15a66bf87a769ee7',
		// '15a662d2e722b61c',
		// '15a65008f7bb4e79',
		// '15a64e47d888c248',
		// '15a64da010a4c9e1',
		// '15a64d9fef77d305',
		// '15a64dd23af97eed',
		// '15a64d9fe33d0d9f',
		// '15a63c9299af0d85',
		// '15a63bc8113114be',
		// '15a63bc808173c3c',
		// '15a63bc7e6d110b8',
		// '15a63bc7d0b48ed6',
		// '15a63bc7cfe643b3',
		// '15a63bc7a283de49',
		// '15a63bc791239fed',
		// '15a6036a158de996',
		// '15a634cb2551f955',
		// '15a634d2c3484125',
		// '15a63e2db1d83ed6',
		// '15a63db8af1acc2f',
		// '15a63e2f48fddc73',
		// '15a63e2d26270e98',
		// '15a5e0a160ba0fa8',
		// '15a6327ccd3130a5',
		// '15a6180142ca818f',
		// '15a62a4e94fd3c93',
		// '15a62ae599a59633',
		// '15a62ae1eaecf6f9',
		// '15a628a4325ac8a3',
		// '15a62a709ec167f7',
		// '15a119281444cac3',
		// '15a62987a9691b39',
		// '15a61422e378cae4',
		// '15a627e9f3c5af38',
		// '15a60dfc40acf2a4',
		// '15a6256ab270f343',
		// '15a6275950c275e2',
		// '15a25de5d263e6a3',
		// '15a68000c006b01f',
		// '15a831e1026134d8',
		// '15a1a1782c680467',
		// '15a833e263663119',
		// '15a8257a3def698d',
		// '15a82c91e465abbb',
		// '15a809596e6bf489',
		// '15a829cd3cd6d5a0',
		// '15a829cd56a49929'

		// FOR SDK TEST
		// '15b687e66fbea0d2',
		// '15b684d8a3fafb2d',
		// '15b6847cea669fd8',
		// '15b65fe90b999d16'
		// '<CAAaf2JeK1o9Lc=a1PFNye718XO7bXtkPcmbLU3qFyo7s22QMjw@mail.gmail.com>',
		// '<CAAaf2JfQ4fHOWuP0ap8mAfdzXF45J+io_7MqX=j5nuFGiFCgZQ@mail.gmail.com>'
	]

	sdk.Router.handleCustomListRoute('tlbeep-finite', function(offset, max) {
		log('tlbeep-finite activate', arguments);
		const threads = customListThreads.slice(
			offset,
			offset + max
		);

		return delay(500, {
			total: customListThreads.length,
			threads
		});
	});

	sdk.Router.handleCustomListRoute('tlbeep-many', function(offset, max) {
		log('tlbeep-many activate', arguments);
		const hasMore = offset + max < customListThreads.length;
		const threads = customListThreads.slice(
			offset,
			offset + max
		);

		return delay(500, {
			hasMore,
			threads
		});
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

	sdk.NavMenu.addNavItem({
		name: 'text',
		routeID: 'text'
	});

	var parentItem = sdk.NavMenu.addNavItem({name: 'Parent'});
	var parent2Item;
	function initItems() {
		if (parent2Item) parent2Item.remove();
		parent2Item = parentItem.addNavItem({
			name: 'Parent2'
		});
		var customNavItem = parent2Item.addNavItem({
			name: 'TL Custom View',
			iconUrl: chrome.runtime.getURL('monkey-face.jpg'),
			routeID: 'tlexample/:monkeyName',
			routeParams: {monkeyName: 'george {} {} {}'},
		});
	}
	initItems();
	setInterval(initItems, 10000);

	var listNavItem = sdk.NavMenu.addNavItem({
		name: 'TL Custom List - Finite',
		iconUrl: chrome.runtime.getURL('monkey-face.jpg'),
		routeID: 'tlbeep-finite',
	});

	var listNavItem = sdk.NavMenu.addNavItem({
		name: 'TL Custom List - Many',
		iconUrl: chrome.runtime.getURL('monkey-face.jpg'),
		routeID: 'tlbeep-many',
	});

	window.parentItem = parentItem;
});

InboxSDK.load(1, 'custom-thread-list').then(function(sdk) {
});
