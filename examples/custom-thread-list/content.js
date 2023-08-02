function log() {
  console.log.apply(
    console,
    ['custom-thread-list'].concat(Array.prototype.slice.call(arguments))
  );
}

function delay(time, value) {
  return new Promise(function (resolve, reject) {
    setTimeout(resolve.bind(null, value), time);
  });
}

InboxSDK.load(1, 'custom-thread-list').then(function (sdk) {
  console.log('current routeview', sdk.Router.getCurrentRouteView());
});

InboxSDK.load(1, 'custom-thread-list').then(function (sdk) {
  window._sdk = sdk;

  sdk.Router.handleAllRoutes(function (routeView) {
    log(
      'handleAllRoutes',
      'id',
      routeView.getRouteID(),
      'type',
      routeView.getRouteType(),
      'params',
      routeView.getParams()
    );
  });

  sdk.Router.handleListRoute(
    sdk.Router.NativeListRouteIDs.ANY_LIST,
    function (listRouteView) {
      window.lastListRouteView = listRouteView;
    }
  );

  sdk.Router.handleCustomRoute('text', function (customRouteView) {
    const el = document.createElement('span');
    el.textContent = 'tlexample';
    el.style.textDecoration = 'underline';
    el.style.color = 'blue';
    el.onclick = function () {
      sdk.Router.goto('tlexample/:monkeyName', { monkeyName: 'bar' });
    };
    customRouteView.getElement().appendChild(el);
  });

  sdk.Router.handleCustomRoute(
    'tlexample/:monkeyName',
    function (customRouteView) {
      customRouteView.getElement().innerHTML =
        'hello world!' +
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
    }
  );

  const customListThreads = [
    '<CAGNQ5Q=0PfRksEgcz-kfgo41BgY4F=3ccPoAp3ERPZhhiA_cKw@mail.gmail.com>',
    '<2666328789625116864@messageid.cloud_prod.monitoring-cloud.google.com>',
    '<CA+jPuQ-=vTFHW_2+mkzYRKqrhWCVhHtR30_cjbJSgL2SYSdp7A@mail.gmail.com>',
    '168ab15e256b2d87',
    '168ab15638a167c4',
    '168aace97e1945f4',
    '168aa647806529de',
    '168aa5886ed431d8',
    '168aa65fecaacc77',
    '168aac437859d27a',
    '168aa4170fd6c369',
    '168a9dc6a0895385',
    '168ab162674537cc',
    '168aa471716bfd1f',
    '168aa892029e78af',
    '168aa0eaaea0f36a',
    '168a9fd58003ea17',
    '168a9f4c65602ea6',
    '168aa015abe2485f',
    '168aa5ebc41526ef',
    '168aa7cc84b940bb',
    '168aa97dcf63070b',
    '168aa88f592196fc',
    '168aa4da78edbe4d',
    '168ab1e2e985110f',
    '168aa1ab308b047e',
    '168aa98beb630696',
    '165e8a7769a5260a',
    '168aa12028d09162',
    '168ab15b5b2b01ba',
    '168aadd827012399',
    '168aa0975cb49559',
    '168aaaca6575c7ae',
    '168ab1abb19c93cf',
    '168aa487a217562b',
    '168ab1c48598c601',
    '168a96b634db9cd1',
    '168aa633fddffe76',
    '168a9dcc542a7bb5',
    '168ab30ad82bc2ec',
    '168aa2ea02f19994',
    '168aa6194b2764db',
    '168a9f9b62b49056',
    '168aa57152233a73',
    '168aa16b935fe65b',
    '168aa7cc5313297d',
    '168aad502d4d7d33',
    '168aa684c763be00',
    '168ab2999cd6dc52',
    '168ab03e3ff6e3cd',
    '168a91a0bd56f137',
    '168a99f606f430cf',
    '168ab1d56ca9d0cd',
    '168ab00cbeb36051',
    '168aa398b08c6558',
    '168a506790044e5c',
    '168aa77e1053374b',
    '168aac2b807b76bc',
    '168aa690783a430a',
    '1688325b30bf1026',
    '168aa8911f275d1b',
    '168aab4dbdb8d1f4',
    '168aa65e88e64cbd',
    '168aa14ec4a88693',
    '168a9f7d485d5691',
    '168aa50ed308a467',
    '168aa6b6b2648f7d',
    '168aa1f084fd03a6',
    '168aa74c8d633710',
    '168aa5095d0e52dd',
    '168aa7726693bb7c',
    '168aa0436a049fb4',
    '168aaab6d4afc457',
    '168aa933b9dd9c9b',
    '168aa1e4301d84bc',
    '168ab0f851a611ce',
    '168aaa774fffd3b0',
    '168aa4c3095e7edc',
    '168aa03e274164e6',
    '168aa431e60b62c5',
    '168a9d8410f4784d',
    '168a9df834485439',
    '168aa024bba0c91c',
    '168aadd1bf66d5f2',
    '168a9dae03a8f2b9',
    '168a9ebc192fa608',
    '168aa226369df1b6',
    '168aa753233fce2c',
    '168aadc7a6994b45',
    '168aadd34fc516c2',
    '168aa727f101fc95',
    '168aaeb56b053e85',
    '168aa238d04ffc1a',
    '168a9fa9bdd04ba7',
    '168aa71f5fd05dea',
    '168aa8cdb0ce9f09',
    '168aa86a7d733c33',
    '168aa322feb93a2b',
    '168aa3ca0b3207f3',
    '168aa8de2057d1f0',
    '168ab03cbe0fe667',
    '168aa9321b53096e',
    '168aae3ed584de2f',
  ];

  sdk.Router.handleCustomListRoute('tlbeep-finite', function (offset, max) {
    log('tlbeep-finite activate', arguments);
    const threads = customListThreads.slice(offset, offset + max);

    return delay(500, {
      total: customListThreads.length,
      threads,
    });
  });

  sdk.Router.handleCustomListRoute('tlbeep-many', function (offset, max) {
    log('tlbeep-many activate', arguments);
    const hasMore = offset + max < customListThreads.length;
    const threads = customListThreads.slice(offset, offset + max);

    return delay(500, {
      hasMore,
      threads,
    });
  });

  sdk.Lists.registerThreadRowViewHandler(function (threadRowView) {
    var routeID = sdk.Router.getCurrentRouteView().getRouteID();
    log(routeID);
    if (routeID === 'tlbeep') {
      threadRowView.replaceDate({
        text: Math.random() > 0.5 ? 'Returning in: 6 months' : 'aaa',
        textColor: 'green',
        title: 'tlbeep',
      });
      threadRowView.addLabel({
        title: 'aaa',
      });
    }
  });

  sdk.NavMenu.addNavItem({
    name: 'text',
    routeID: 'text',
  });

  var parentItem = sdk.NavMenu.addNavItem({ name: 'Parent' });
  var parent2Item;
  function initItems() {
    if (parent2Item) parent2Item.remove();
    parent2Item = parentItem.addNavItem({
      name: 'Parent2',
    });
    var customNavItem = parent2Item.addNavItem({
      name: 'TL Custom View',
      iconUrl: chrome.runtime.getURL('monkey-face.jpg'),
      routeID: 'tlexample/:monkeyName',
      routeParams: { monkeyName: 'george {} {} {}' },
    });
  }
  initItems();
  setInterval(initItems, 10000);

  var listNavItem = sdk.NavMenu.addNavItem({
    iconUrl: chrome.runtime.getURL('monkey-face.jpg'),
    name: 'TL Custom List - Finite',
    routeID: 'tlbeep-finite',
  });

  var listNavItem = sdk.NavMenu.addNavItem({
    accessory: {
      type: 'DROPDOWN_BUTTON',
      buttonBackgroundColor: 'tomato',
      buttonForegroundColor: 'gray',
      onClick: (event) => {
        event.dropdown.el.innerHTML = 'this is a dropdown';
      },
    },
    name: 'TL Custom List - Many',
    iconUrl: chrome.runtime.getURL('monkey-face.jpg'),
    routeID: 'tlbeep-many',
  });

  window.parentItem = parentItem;
});

InboxSDK.load(1, 'custom-thread-list').then(function (sdk) {});
