function log() {
  console.log.apply(
    console,
    ['nav-menu'].concat(Array.prototype.slice.call(arguments))
  );
}

InboxSDK.load(1, 'nav-menu').then(function (sdk) {
  var appendStylesheet = function (url) {
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

  sdk.Router.handleCustomRoute(
    'this-is-a-parent-custom-route',
    (customRouteView) => {
      const el = document.createElement('span');
      el.innerHTML = 'This is a parent custom route!';
      customRouteView.getElement().appendChild(el);
    }
  );

  sdk.Router.handleCustomRoute(
    'this-is-a-child-custom-route',
    (customRouteView) => {
      const el = document.createElement('span');
      el.innerHTML = 'This is a child custom route!';
      customRouteView.getElement().appendChild(el);
    }
  );

  const initNavItemAdd = () => {
    const parent = sdk.NavMenu.addNavItem({
      accessory: {
        onClick: () => {
          const newParent = sdk.NavMenu.addNavItem({
            accessory: {
              onClick: () => {
                newParent.remove();
              },
              type: 'CREATE',
            },
            name: 'Click to Remove',
          });
        },
        type: 'CREATE',
      },
      name: 'P - Add New NavItem',
    });

    const child = parent.addNavItem({
      accessory: {
        onClick: () => {
          const newChild = parent.addNavItem({
            accessory: {
              onClick: () => {
                newChild.remove();
              },
              type: 'CREATE',
            },
            name: 'Click to Remove',
          });
        },
        type: 'CREATE',
      },
      name: 'Add New Child',
    });
  };

  const initNavItemSubtitle = () => {
    const parent = sdk.NavMenu.addNavItem({
      name: 'P - with Subtitle',
    });

    const child = parent.addNavItem({
      name: 'C - with Subtitle',
      subtitle: '123',
    });
  };

  const initNavItemCollapse = () => {
    const parent = sdk.NavMenu.addNavItem({
      accessory: {
        onClick: () => {
          parent.setCollapsed(!parent.isCollapsed());
        },
        type: 'CREATE',
      },
      name: 'P - Toggle Collapse',
    });

    const child = parent.addNavItem({
      accessory: {
        onClick: () => {
          child.setCollapsed(!child.isCollapsed());
        },
        type: 'CREATE',
      },
      name: 'C - Toggle Collapse',
    });

    child.addNavItem({
      name: 'Child of Child',
    });
  };

  const initNavItemChildren = () => {
    const parent = sdk.NavMenu.addNavItem({
      name: 'P - with Children',
    });

    childIconUrl = parent.addNavItem({
      iconUrl: chrome.runtime.getURL('monkey-face.jpg'),
      name: 'Child iconUrl',
      orderHint: 2,
    });

    const iconElement = document.createElement('div');
    iconElement.innerHTML = 'S';
    Object.assign(iconElement.style, {
      alignItems: 'center',
      backgroundColor: 'tomato',
      borderRadius: '50%',
      color: 'white',
      display: 'flex',
      height: '18px',
      justifyContent: 'center',
      marginLeft: '1px',
      width: '18px',
    });

    childIconElement = parent.addNavItem({
      iconElement,
      name: 'Child iconElement',
      orderHint: 1,
    });

    childIconClass = parent.addNavItem({
      iconClass: 'navMenu_iconClass_example',
      name: 'Child iconClass',
      orderHint: 3,
    });

    childIconUrl.addNavItem({
      name: 'Child of Child',
    });

    childIconElement.addNavItem({
      name: 'Child of Child',
    });

    childIconClass.addNavItem({
      name: 'Child of Child ',
    });
  };

  const initNavItemAccessoryAndIcon = () => {
    appendStylesheet();

    sdk.NavMenu.addNavItem({
      accessory: {
        onClick: (event) => {
          event.dropdown.el.innerHTML = 'This is the dropdown el';
        },
        type: 'DROPDOWN_BUTTON',
      },
      name: 'P - Dropdown w/o icon',
    });

    sdk.NavMenu.addNavItem({
      accessory: {
        onClick: (event) => {
          event.dropdown.el.innerHTML = 'This is the dropdown el';
        },
        type: 'CREATE',
      },
      iconClass: 'bentoBoxIndicator',
      name: 'P - Create w/ iconClass',
    });
  };

  const initNavItemAccessories = () => {
    sdk.NavMenu.addNavItem({
      accessory: {
        onClick: (event) => {
          event.dropdown.el.innerHTML = 'This is the dropdown el';
        },
        type: 'DROPDOWN_BUTTON',
      },
      name: 'P - Dropdown',
    });

    sdk.NavMenu.addNavItem({
      accessory: {
        onClick: () => {
          alert('Create accessory clicked');
        },
        type: 'CREATE',
      },
      name: 'P - Create',
    });
  };

  const initNavItemIcons = () => {
    appendStylesheet();

    sdk.NavMenu.addNavItem({
      iconUrl: chrome.runtime.getURL('monkey-face.jpg'),
      routeID: 'this-is-a-parent-custom-route',
      name: 'P - iconUrl',
    });

    const iconElement = document.createElement('div');
    iconElement.innerHTML = 'S';
    Object.assign(iconElement.style, {
      alignItems: 'center',
      backgroundColor: 'tomato',
      borderRadius: '50%',
      color: 'white',
      display: 'flex',
      height: '18px',
      justifyContent: 'center',
      width: '18px',
    });

    sdk.NavMenu.addNavItem({
      iconElement,
      routeID: 'this-is-a-parent-custom-route',
      name: 'P - iconElement',
    });

    const parentIconClass = sdk.NavMenu.addNavItem({
      iconClass: 'bentoBoxIndicator',
      routeID: 'this-is-a-parent-custom-route',
      name: 'P - iconClass',
    });
  };

  const initNavItemRoute = () => {
    const parent = sdk.NavMenu.addNavItem({
      name: 'P - Custom Route',
      routeID: 'this-is-a-parent-custom-route',
    });

    parent.addNavItem({
      name: 'C - Custom Route',
      routeID: 'this-is-a-child-custom-route',
    });
  };

  // initNavItemAdd();
  // initNavItemSubtitle();
  initNavItemCollapse();
  // initNavItemChildren();
  // initNavItemAccessoryAndIcon();
  // initNavItemAccessories();
  initNavItemIcons();
  // initNavItemRoute();
});
