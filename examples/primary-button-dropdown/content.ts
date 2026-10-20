import * as InboxSDK from '@inboxsdk/core';

const extension = (
  globalThis as unknown as {
    chrome: { runtime: { getURL: (path: string) => string } };
  }
).chrome;

InboxSDK.load(2, 'sdk-primary-button-dropdown-demo').then(async (sdk) => {
  const routeId = 'sdk-dropdown-demo';
  const appMenuShown = await sdk.AppMenu.isShown();
  sdk.Router.handleCustomRoute(routeId, (view) => {
    const content = document.createElement('div');
    content.style.cssText = 'padding:40px;font:16px/1.6 Arial;color:#202124';
    content.innerHTML = `
      <h1 style="font-size:28px;margin:0 0 12px">New menu demo</h1>
      <p>${
        appMenuShown
          ? 'Click <strong>New</strong> in the sidebar to open the menu.'
          : 'Click the <strong>+</strong> beside <strong>Demo</strong> in Gmail’s sidebar.'
      }</p>
      <p>${
        appMenuShown
          ? 'Collapse Gmail’s sidebar, hover over the <strong>Demo</strong> icon, then try New again.'
          : 'Chat and Meet are off, so this demo uses the SDK’s standard plus button.'
      }</p>
      <p>Use ↑ and ↓ to move through the menu, Enter to choose, or Escape to close.</p>
      <p style="color:#5f6368">New email opens a blank Gmail compose window. The other choices show a sample message without creating anything.</p>`;
    view.getElement().appendChild(content);
  });

  if (!appMenuShown) {
    const nav = sdk.NavMenu.addNavItem({
      name: 'Demo',
      iconUrl: extension.runtime.getURL('icon.svg'),
      routeID: routeId,
      accessory: {
        type: 'CREATE',
        hasDropdown: true,
        onClick: ({ dropdown }) => {
          if (dropdown) fillMenu(dropdown);
        },
      },
    });
    nav.addNavItem({ name: 'Try the menu', routeID: routeId });
    nav.addNavItem({ name: 'Sample pipeline', routeID: routeId });
    nav.setCollapsed(false);
    return;
  }

  const app = sdk.AppMenu.addMenuItem({
    name: 'Demo',
    insertIndex: 1,
    iconUrl: { lightTheme: extension.runtime.getURL('icon.svg') },
    isRouteActive: (route) => route.getRouteID() === routeId,
    onClick: () => {
      void sdk.Router.goto(routeId);
    },
  });
  const panel = await app.addCollapsiblePanel({
    primaryButton: {
      name: 'New',
      hasDropdown: true,
      iconUrl: { lightTheme: extension.runtime.getURL('icon.svg') },
      onClick: ({ dropdown }) => {
        if (dropdown) fillMenu(dropdown);
      },
    },
  });
  panel?.addNavItem({ name: 'Try the menu', routeID: routeId });
  panel?.addNavItem({ name: 'Sample pipeline', routeID: routeId });

  function fillMenu(dropdown: InboxSDK.DropdownView) {
    const { menu, focusFirst } = createMenu(() => dropdown.close());
    dropdown.el.appendChild(menu);
    requestAnimationFrame(() => {
      if (!dropdown.destroyed) focusFirst();
    });
  }

  function createMenu(close: () => void) {
    const menu = document.createElement('div');
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-label', 'New');
    menu.style.cssText =
      'padding:6px;background:white;color:#202124;font:14px Arial;min-width:170px';
    const choices = [
      { label: 'New Box', icon: '▣', run: () => showSample('New Box') },
      { label: 'New Task', icon: '☑', run: () => showSample('New Task') },
      {
        label: 'New email',
        icon: '✉',
        run: () => {
          void sdk.Compose.openNewComposeView();
        },
      },
      {
        label: 'New pipeline',
        icon: '▱',
        divider: true,
        run: () => showSample('New pipeline'),
      },
    ];
    const buttons = choices.map((choice) => {
      if (choice.divider) {
        const divider = document.createElement('div');
        divider.setAttribute('role', 'separator');
        divider.style.cssText = 'height:1px;background:#dadce0;margin:5px 0';
        menu.appendChild(divider);
      }
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('role', 'menuitem');
      button.style.cssText =
        'display:flex;align-items:center;gap:12px;width:100%;padding:10px 12px;border:0;border-radius:4px;background:white;color:inherit;font:inherit;text-align:left;cursor:pointer';
      const icon = document.createElement('span');
      icon.textContent = choice.icon;
      icon.setAttribute('aria-hidden', 'true');
      icon.style.cssText = 'width:20px;font-size:20px;text-align:center';
      button.append(icon, document.createTextNode(choice.label));
      button.addEventListener('focus', () => {
        button.style.background = '#e8eaf6';
      });
      button.addEventListener('blur', () => {
        button.style.background = 'white';
      });
      button.addEventListener('mouseenter', () => button.focus());
      button.addEventListener('click', () => {
        close();
        choice.run();
      });
      menu.appendChild(button);
      return button;
    });
    menu.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' || event.key === 'Tab') {
        if (event.key === 'Escape') event.preventDefault();
        close();
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const index = buttons.indexOf(
          document.activeElement as HTMLButtonElement,
        );
        buttons[
          (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) %
            buttons.length
        ].focus();
      }
    });
    return { menu, focusFirst: () => buttons[0].focus() };
  }

  function showSample(label: string) {
    sdk.ButterBar.showMessage({
      text: `${label} selected — demo only`,
      time: 4000,
    });
  }
});
