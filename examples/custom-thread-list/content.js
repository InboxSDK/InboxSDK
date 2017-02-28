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

	sdk.Router.handleCustomListRoute('tlbeep', function(page) {
		log('tlbeep activate', arguments);
		const hasMore = page === 0;
		return delay(500, {
			hasMore,
			threads: [
				'<CAGNQ5Q=0PfRksEgcz-kfgo41BgY4F=3ccPoAp3ERPZhhiA_cKw@mail.gmail.com>',
				'<2666328789625116864@messageid.cloud_prod.monitoring-cloud.google.com>',
				'<CA+jPuQ-=vTFHW_2+mkzYRKqrhWCVhHtR30_cjbJSgL2SYSdp7A@mail.gmail.com>',
				'15a67bc14fa7cf22',
				'15a6779548b80de6',
				'15a6736f08e9489d',
				'15a673d2791c478d',
				'15a62ad1b0327eee',
				'15a61c86123fa1de',
				'15a672a7351c13f8',
				'15a66bf87a769ee7',
				'15a662d2e722b61c',
				'15a65008f7bb4e79',
				'15a64e47d888c248',
				'15a64da010a4c9e1',
				'15a64d9fef77d305',
				'15a64dd23af97eed',
				'15a64d9fe33d0d9f',
				'15a63c9299af0d85',
				'15a63bc8113114be',
				'15a63bc808173c3c',
				'15a63bc7e6d110b8',
				'15a63bc7d0b48ed6',
				'15a63bc7cfe643b3',
				'15a63bc7a283de49',
				'15a63bc791239fed',
				'15a6036a158de996',
				'15a634cb2551f955',
				'15a634d2c3484125',
				'15a63e2db1d83ed6',
				'15a63db8af1acc2f',
				'15a63e2f48fddc73',
				'15a63e2d26270e98',
				'15a5e0a160ba0fa8',
				'15a6327ccd3130a5',
				'15a6180142ca818f',
				'15a62a4e94fd3c93',
				'15a62ae599a59633',
				'15a62ae1eaecf6f9',
				'15a628a4325ac8a3',
				'15a62a709ec167f7',
				'15a119281444cac3',
				'15a62987a9691b39',
				'15a61422e378cae4',
				'15a627e9f3c5af38',
				'15a60dfc40acf2a4',
				'15a6256ab270f343',
				'15a6275950c275e2',
				'15a25de5d263e6a3',
				'15a68000c006b01f'
				//'15a67807e8285ee0'
				// '<047d7bd9165ad4aeca0528263d7f@google.com>',
				// '<001a11371450f291a7052826378d@google.com>',
				// '<001a113fe6d06812d605282317b7@google.com>',
				// '<001a11c20e3cb33b34052823119e@google.com>',
				// '<001a1141f0205e8fc6052822e630@google.com>',
				// '<001a11c26c6660c605052822e0ff@google.com>',
				// '<94eb2c0770f4621b530528229e43@google.com>',
				// '<001a113843cac079f205282298aa@google.com>',
				// '<001a1136b7d82272b3052822690d@google.com>',
				// '<001a11c215129742ad0511fdbedb@google.com>',
				// '<047d7bd908ee50d1d6051c089b72@google.com>',
				// '<001a113678d82ec311051c08933b@google.com>',
				// '<001a11c2e51ccba39c051c083e7d@google.com>',
				// '<001a113f8df40096bf051c07efbe@google.com>',
				// '<001a11330f2c9ccbff051c07eb3c@google.com>',
				// '<089e013cc4142a1f94051c07d8c3@google.com>',
				// '<94eb2c0365b8b63213051c07cfa7@google.com>',
				// '<001a1133f9ca6dc66e051c0775c0@google.com>',
				// '<001a11c301ba85a533051c0768cd@google.com>',
				// '<089e011839927c99e8051bfe20f1@google.com>',
				// '<94eb2c0928d6639f92051bfe15f2@google.com>',
				// '<001a113835c624d2bb051bfe0a4b@google.com>',
				// '<001a113eda3289c121051bfe0662@google.com>',
				// '<047d7b15accdfc530d051bfc9a45@google.com>',
				// '<001a11427abce8532b051bfc8e1c@google.com>',
				// '<001a11340b9ce70c5e051bfbfd61@google.com>',
				// '<001a11c327dac2b2a7051bfbf856@google.com>',
				// '14ed7f99f4aa538c',
				// '14ed7dad3619a4db',
				// '14ed7d7702a39965',
				// '14ed79a79b67fb01',
				// '14ed79998801f59a',
				// '14ed7600ce67788a',
				// '14ed75f190f5b79c',
				// '14ed6e66ed57ec52',
				// '14ed6e467470859e',
				// '14ed692d258578d9',
				// '14ed68fc9f857a59'
			]
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
		name: 'TL Custom List',
		iconUrl: chrome.runtime.getURL('monkey-face.jpg'),
		routeID: 'tlbeep',
	});

	window.parentItem = parentItem;
});

InboxSDK.load(1, 'custom-thread-list').then(function(sdk) {
});
