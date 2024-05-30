import * as InboxSDK from '@inboxsdk/core';

function log(...args: any[]) {
  console.log(...['app-menu'].concat(args));
}

var chrome = (globalThis as any).chrome;

// replace app-menu with your app id
InboxSDK.load(2, 'app-menu').then(async (sdk) => {
  var appendStylesheet = function (url: string) {
    const css =
      '.inboxsdk__button_icon.bentoBoxIndicator { background: transparent url(https://assets.streak.com/clientjs-commit-builds/assets/pipelineIndicator.ebfc97a74f09365a433e8537ff414815.png) no-repeat; height: 18px; width: 18px; }';
    const head = document.head || document.getElementsByTagName('head')[0];
    const style = document.createElement('style');

    head.appendChild(style);
    style.type = 'text/css';
    style.appendChild(document.createTextNode(css));

    const sheet = document.createElement('link');
    sheet.rel = 'stylesheet';
    sheet.type = 'text/css';
    sheet.href = url;
    document.head.appendChild(sheet);
  };

  for (const n of [1, 2, 3]) {
    sdk.Router.handleCustomRoute(`custom-route-${n}`, (customRouteView) => {
      const el = document.createElement('span');
      el.innerHTML = `This is custom route ${n}`;
      customRouteView.getElement().appendChild(el);
    });
  }

  if (!sdk.AppMenu.isShown()) {
    alert(
      'App menu is not enabled. Please enable Meet or Chat it in Gmail settings.',
    );
  }

  const customItem1 = sdk.AppMenu.addMenuItem({
      name: 'Lion menu item',
      insertIndex: 1,
      iconUrl: {
        lightTheme: chrome.runtime.getURL('lion.png'),
      },
      onClick: () => {
        log('clicked custom menu item 1');
      },
      routeID: 'custom-route-1',
      isRouteActive: (route) => {
        const routeID = route.getRouteID();
        return routeID === 'custom-route-1';
      },
    }),
    customItem2 = sdk.AppMenu.addMenuItem({
      name: 'monkey',
      onClick: () => {
        log('clicked custom menu item 2');
        sdk.Router.goto('custom-route-2');
      },
      routeID: 'custom-route-2',
      isRouteActive: (route) => {
        const routeID = route.getRouteID();
        return routeID === 'custom-route-2';
      },
      iconUrl: {
        lightTheme: chrome.runtime.getURL('monkey.png'),
      },
    }),
    /** No panel with this menu item */
    customItem3 = sdk.AppMenu.addMenuItem({
      name: 'No panel',
      onClick: () => {
        log('clicked custom menu item 3');
        // sdk.Router.goto('custom-route-3');
      },
      routeID: 'custom-route-3',
      isRouteActive: (route) => {
        const routeID = route.getRouteID();
        return routeID === 'custom-route-3';
      },
      iconUrl: {
        lightTheme: chrome.runtime.getURL('monkey-face.jpg'),
      },
    }),
    panel1 = await customItem1.addCollapsiblePanel({
      // title: 'Lion panel',
      primaryButton: {
        name: 'Lion panel',
        onClick: () => alert('clicked custom panel 1'),
        iconUrl: { lightTheme: chrome.runtime.getURL('lion.png') },
      },
    }),
    panel2 = await customItem2.addCollapsiblePanel({
      loadingIcon: `<div>
      Slow loading...20s&nbsp;
      <img src="${chrome.runtime.getURL(
        'monkey.png',
      )}" width="20" height="20" />
    </div>`,
      primaryButton: {
        name: 'Monkey panel',
        onClick: () => alert('clicked custom panel 2'),
        iconUrl: { lightTheme: chrome.runtime.getURL('monkey.png') },
      },
    });
  // if either of following error is thrown, it means that your app menu is not enabled
  // make sure that your app menu is enabled by going to Gmail's `Settings > Chat and Meet` and enabling
  // at least either Chat or Meet.
  if (!panel1) {
    throw new Error('panel1 is undefined');
  }
  if (!panel2) {
    throw new Error('panel2 is undefined');
  }
  panel2.setLoading(true);

  // Simulate very slow loading.
  new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, 20_000);
  }).then(() => {
    panel2.setLoading(false);
  });

  panel1.addNavItem({
    name: 'Nav Item 1',
    onClick: () => sdk.Router.goto('custom-route-3'),
  });

  panel1.addNavItem({
    name: 'Nav Item with spacing',
    spacingAfter: true,
    onClick: () => sdk.Router.goto('custom-route-3'),
  });

  panel1.addNavItem({
    name: 'Another Nav Item',
    onClick: () => sdk.Router.goto('custom-route-3'),
  });

  const p2 = panel1.addNavItem({
    name: 'Categories (empty)',
    type: 'SECTION',
    onClick: () => alert('clicked Add Category button'),
  });

  const sectionNested = panel1.addNavItem({
    name: 'Labels',
    type: 'SECTION',
    sectionTooltip: 'Add label',
    onClick: () => alert('clicked Add Label button'),
  });

  new Array(10).fill(0).forEach((_, i) => {
    sectionNested.addNavItem({
      name: `Label ${i + 1}`,
      onClick: () => sdk.Router.goto('custom-route-3'),
    });
  });

  sdk.AppMenu.events
    .filter((event) => event.name === 'collapseToggled')
    .onValue((event) => {
      console.log('collapseToggled', event);
    });
});
