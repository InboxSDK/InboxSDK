import * as InboxSDK from '@inboxsdk/core';

InboxSDK.load(2, 'simple-example').then(function (inboxSDK) {
  let i = 0;

  inboxSDK.Compose.registerComposeViewHandler((composeView) => {
    const statusBar = composeView.addStatusBar({ height: 24 });
    statusBar.el.textContent = 'Mole example: compose status bar';

    composeView.addButton({
      title: 'Open Drawer',
      iconUrl:
        'data:image/svg+xml,' +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#444746" d="M3 3h18v18H3V3zm2 2v14h9V5H5zm11 0v14h3V5h-3z"/></svg>',
        ),
      onClick() {
        const el = document.createElement('div');
        el.style.padding = '16px';
        el.textContent =
          'Focus To, Cc, or Bcc and check that the compose toolbar and status bar stay visible. Close the drawer and check again.';
        inboxSDK.Widgets.showDrawerView({
          composeView,
          closeWithCompose: true,
          el,
          title: 'Mole Example Drawer',
        });
      },
    });
  });

  window.makeMoleWidget = function () {
    const div = document.createElement('div');
    div.style.width = '300px';
    div.style.padding = '16px';
    div.style.minHeight = '160px';
    div.textContent =
      'Open a Gmail compose beside this window. Check the corners, spacing, and minimize/restore buttons. Use Open Drawer in the compose toolbar to check the drawer layout.';

    const minimizedTitleEl = document.createElement('div');
    minimizedTitleEl.textContent = 'Mole Example (minimized)';
    const mole = inboxSDK.Widgets.showMoleView({
      el: div,
      title: 'Mole Example ' + ++i,
      minimizedTitleEl: minimizedTitleEl,
    });

    mole.on('destroy', console.log.bind(console, 'mole destroy'));
    mole.on('minimize', console.log.bind(console, 'mole minimize'));
    mole.on('restore', console.log.bind(console, 'mole restore'));

    return mole;
  };

  window._mole = window.makeMoleWidget();

  window.makeChromelessMoleWidget = function () {
    const div = document.createElement('div');
    div.textContent = 'Mole example without a title bar';
    div.style.height = '500px';

    const mole = inboxSDK.Widgets.showMoleView({
      el: div,
      chrome: false,
    });

    return mole;
  };
});
