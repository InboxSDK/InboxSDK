function log() {
  console.log.apply(console, ['nav-menu'].concat(Array.prototype.slice.call(arguments)));
}

InboxSDK.load(1, 'nav-menu').then(function(sdk) {
  sdk.Router.handleCustomRoute('this-is-a-parent-custom-route', (customRouteView) => {
    const el = document.createElement('span');
    el.innerHTML = "This is a parent custom route!";
    customRouteView.getElement().appendChild(el);
  });

  sdk.Router.handleCustomRoute('this-is-a-child-custom-route', (customRouteView) => {
    const el = document.createElement('span');
    el.innerHTML = "This is a child custom route!";
    customRouteView.getElement().appendChild(el);
  });

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
            name: "Click to Remove"
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
            name: "Click to Remove"
          });
        },
        type: 'CREATE',
      },
      name: 'Add New Child',
    })
  }

  const initNavItemSubtitle = () => {
    const parent = sdk.NavMenu.addNavItem({
      name: 'P - with Subtitle'
    });

    const child = parent.addNavItem({
      name: 'C - with Subtitle',
      subtitle: '123'
    });
  }

  const initNavItemToggle = () => {
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
      name: 'C - Toggle Collapse'
    });
  
    child.addNavItem({
      name: 'Child of Child'
    });    
  }

  const initNavItemChildren = () => {
    const parent = sdk.NavMenu.addNavItem({
      name: 'P - with Children',
    });
  
    childIconUrl = parent.addNavItem({
      iconUrl: chrome.runtime.getURL('monkey-face.jpg'),
      name: 'Child iconUrl'
    });

    const iconElement = document.createElement('div');
    iconElement.innerHTML = "S";
    Object.assign(iconElement.style, {
      alignItems: "center",
      backgroundColor: "tomato",
      borderRadius: "50%",
      color: "white",
      display: "flex",
      height: "18px",
      justifyContent: "center",
      marginLeft: "1px",
      width: "18px"
    });

    childIconElement = parent.addNavItem({
      iconElement,
      name: 'Child iconElement'
    });

    childIconClass = parent.addNavItem({
      iconClass: 'navMenu_iconClass_example',
      name: 'Child iconClass'
    });
  
    childIconUrl.addNavItem({
      name: 'Child of Child'
    });

    childIconElement.addNavItem({
      name: 'Child of Child'
    });

    childIconClass.addNavItem({
      name: 'Child of Child '
    });
  }

  const initNavItemAccessories = () => {
    sdk.NavMenu.addNavItem({
      accessory: {
        onClick: event => {
          event.dropdown.el.innerHTML = 'This is the dropdown el';
        },
        type: 'DROPDOWN_BUTTON',
      },
      name: 'P - Dropdown',
    });
  
    sdk.NavMenu.addNavItem({
      accessory: {
        onClick: () => {
          alert("Create accessory clicked");
        },
        type: 'CREATE'
      },
      name: 'P - Create',
    });
  }

  const initNavItemIcons = () => {
    sdk.NavMenu.addNavItem({
      iconUrl: chrome.runtime.getURL('monkey-face.jpg'),
      name: 'P - iconUrl'
    });
  
    const iconElement = document.createElement('div');
    iconElement.innerHTML = "S";
    Object.assign(iconElement.style, {
      alignItems: "center",
      backgroundColor: "tomato",
      borderRadius: "50%",
      color: "white",
      display: "flex",
      height: "18px",
      justifyContent: "center",
      marginLeft: "1px",
      width: "18px"
    });
  
    sdk.NavMenu.addNavItem({
      iconElement,
      name: 'P - iconElement'
    });
  
    const parentIconClass = sdk.NavMenu.addNavItem({
      iconClass: 'navMenu_iconClass_example',
      name: 'P - iconClass',
    });
  
  }

  const initNavItemRoute = () => {
    const parent = sdk.NavMenu.addNavItem({
      name: 'P - Custom Route',
      routeID: 'this-is-a-parent-custom-route',
    });

    parent.addNavItem({
      name: 'C - Custom Route',
      routeID: 'this-is-a-child-custom-route',
    })
  }

  const initNavItem = () => {
    sdk.NavMenu.addNavItem({
      name: 'Parent'
    });
  }

  initNavItemAdd();
  initNavItemSubtitle();
  initNavItemToggle();
  initNavItemChildren();
  initNavItemAccessories();
  initNavItemIcons();
  initNavItemRoute();
  initNavItem();
});
