function log() {
  console.log.apply(console, ['custom-view'].concat(Array.prototype.slice.call(arguments)));
}

InboxSDK.load(2, 'custom-view').then(function(sdk) {
  window._sdk = sdk;
  var threadIds = new Set();

  sdk.Lists.registerThreadRowViewHandler(function(threadRowView) {
    threadRowView.getThreadIDAsync().then(threadId => {
      threadIds.add(threadId);
    });
  });

  sdk.Router.handleCustomRoute('example/:monkeyName', function(customRouteView) {
    customRouteView.setFullWidth(false);

    customRouteView.getElement().textContent = 'hello world! ' + customRouteView.getParams().monkeyName;
    const list = document.createElement('ul');
    // threadIds.forEach(function(threadId) {
    //   const link = document.createElement('a');
    //   link.href = sdk.Router.createLink(sdk.Router.NativeRouteIDs.THREAD, {threadID: threadId});
    //   link.textContent = threadId;
    //   const item = document.createElement('li');
    //   item.appendChild(link);
    //   list.appendChild(item);
    // });

    {
      const link = document.createElement('a');
      link.href = sdk.Router.createLink('example/:monkeyName', {monkeyName: 'linktest'});
      link.textContent = 'linktest';
      const item = document.createElement('li');
      item.appendChild(link);
      list.appendChild(item);
    }

    customRouteView.getElement().appendChild(list);
  });

  sdk.Router.handleAllRoutes(function(routeView) {
    log(
      'id', routeView.getRouteID(),
      'type', routeView.getRouteType(),
      'params', routeView.getParams()
    );
  });

  sdk.NavMenu.SENT_MAIL.addNavItem({
    name: 'Sent Monkeys'
  });

  sdk.NavMenu.addNavItem({
    name: 'beep',
    iconUrl: chrome.runtime.getURL('monkey-face.jpg'),
    routeID: 'beep',
    subtitle: '123',
    accessory: {
      type: 'DROPDOWN_BUTTON',
      buttonBackgroundColor: 'red',
      onClick: function(event) {
        event.dropdown.el.innerHTML = 'Hello world!';
      }
    }
  });

  sdk.Router.handleCustomRoute('beep', function(customRouteView) {
    customRouteView.getElement().innerHTML = 'beep';
  });

  var navItem = sdk.NavMenu.addNavItem({
    name: 'Monkeys',
    iconUrl: chrome.runtime.getURL('monkey-face.jpg'),
    routeID: 'example/:monkeyName',
    routeParams: {monkeyName: 'george {} {} {}'},
    type: sdk.NavMenu.NavItemTypes.LINK,
    accessory: {
      type: 'CREATE',
      onClick: function() {
        log('create monkeys');
      }
    }
  });

  var lion = navItem.addNavItem({
    name: 'Lions',
    routeID: sdk.Router.NativeRouteIDs.THREAD,
    routeParams: {
      threadID: '14aa1bcd3deefcf7'
    },
    iconUrl: chrome.runtime.getURL('lion.png'),
    accessory: {
      type: 'ICON_BUTTON',
      iconUrl: chrome.runtime.getURL('lion.png'),
      onClick: function() {
        log('lions rocks!');
      }
    }
  });

  var monkey = lion.addNavItem({
    name: 'Saved View',
    iconUrl: chrome.runtime.getURL('monkey.png'),
    subtitle: '456',
    accessory: {
      type: 'SETTINGS_BUTTON',
      onClick: function(event) {
        event.dropdown.el.innerHTML = 'Hello world!';
      }
    }
  });

  sdk.NavMenu.addNavItem({
    name: 'Saved View 2',
    orderHint: -1,
    subtitle: '789',
    accessory: {
      type: 'DROPDOWN_BUTTON',
      buttonBackgroundColor: 'red',
      onClick: function(event) {
        event.dropdown.el.innerHTML = 'Hello world!';
      }
    }
  });

  lion.addNavItem({
    name: 'Lion item',
    onClick: () => {
      console.log('LION ITEM WAS CLICKED');
    }
  });

  var grouperNavItem = navItem.addNavItem({
    name: 'GROUPER Monkeys',
    subtitle: 'grouper',
    type: sdk.NavMenu.NavItemTypes.GROUPER,
    // All the following options should be ignored in Gmailv2
    iconUrl: chrome.runtime.getURL('monkey-face.jpg'),
    routeID: 'example/:monkeyName',
    routeParams: {monkeyName: 'george {} {} {}'},
    onClick: () => {
      console.log('GROUPER ITEM WAS CLICKED');
    },
    accessory: {
      type: 'CREATE',
      onClick: function() {
        log('create monkeys');
      }
    }
  });

  grouperNavItem.addNavItem({
    name: 'Saved View 3',
    subtitle: 'test',
    onClick: () => {
      console.log('SV2 CLICKED');
    },
    accessory: {
      type: 'DROPDOWN_BUTTON',
      onClick: function(event) {
        event.dropdown.el.innerHTML = 'Hello world!';
      }
    }
  });

  const grouperSub = grouperNavItem.addNavItem({
    name: 'Saved View 4',
    iconUrl: chrome.runtime.getURL('monkey.png'),
    subtitle: '456',
    accessory: {
      type: 'SETTINGS_BUTTON',
      onClick: function(event) {
        event.dropdown.el.innerHTML = 'Hello world!';
      }
    }
  });

  grouperSub.addNavItem({
    name: 'Lion item',
    onClick: () => {
      console.log('LION ITEM WAS CLICKED');
    }
  });
});
