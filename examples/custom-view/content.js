function log() {
  console.log.apply(console, ['custom-view'].concat(Array.prototype.slice.call(arguments)));
}

InboxSDK.load(2, 'custom-view').then(function(sdk) {
  window._sdk = sdk;
  var threadIds = new Set();

  sdk.Lists.registerThreadRowViewHandler(function(threadRowView) {
    threadIds.add(threadRowView.getThreadID());
  });

  sdk.Router.handleCustomRoute('example/:monkeyName', function(customRouteView) {
    customRouteView.setFullWidth(false);

    customRouteView.getElement().textContent = 'hello world! ' + customRouteView.getParams().monkeyName;
    var list = document.createElement('ul');
    threadIds.forEach(function(threadId) {
      var link = document.createElement('a');
      link.href = sdk.Router.createLink(sdk.Router.NativeRouteIDs.THREAD, {threadID: threadId});
      link.onclick = function(event) {
        event.preventDefault();
        event.stopPropagation();
        sdk.Router.goto(sdk.Router.NativeRouteIDs.THREAD, {threadID: threadId});
      };
      link.textContent = threadId;
      var item = document.createElement('li');
      item.appendChild(link);
      list.appendChild(item);
    });
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
    routeID: 'beep'
  });

  sdk.Router.handleCustomRoute('beep', function(customRouteView) {
    customRouteView.getElement().innerHTML = 'beep';
  });

  var navItem = sdk.NavMenu.addNavItem({
    name: 'Monkeys',
    iconUrl: chrome.runtime.getURL('monkey-face.jpg'),
    routeID: 'example/:monkeyName',
    routeParams: 'george {} {} {}',
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
    accessory: {
      type: 'DROPDOWN_BUTTON',
      onClick: function(event) {
        event.dropdown.el.innerHTML = 'Hello world!';
      }
    }
  });

  sdk.NavMenu.addNavItem({
    name: 'Saved View 2',
    orderHint: -1,
    accessory: {
      type: 'DROPDOWN_BUTTON',
      onClick: function(event) {
        event.dropdown.el.innerHTML = 'Hello world!';
      }
    }
  });

  lion.addNavItem({
    name: 'Lion item'
  });
});
