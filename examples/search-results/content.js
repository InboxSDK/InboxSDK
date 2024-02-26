/// <reference path="../types.d.ts" />

InboxSDK.load(1.0, 'search-example').then(function (inboxSDK) {
  inboxSDK.Router.handleListRoute(
    inboxSDK.Router.NativeRouteIDs.INBOX,
    (listRouteView) => {
      listRouteView.addCollapsibleSection({
        title: ' Inbox Monkeys',
        subtitle: 'Subtitle /',
        titleLinkText: 'View All',
        hasDropdown: true,
        /** A dropdown would go here, but isn't hooked up in this example. */
        onDropdownClick: () => {
          console.log('title link clicked');
        },
        tableRows: [
          {
            title: 'new after @inboxsdk/core@2.1.32',
            snippet: ({ el, unmountPromise }) => {
              el.textContent = 'I set text content';
              unmountPromise.then(() => {
                console.log('unmounting table row');
              });
            },
            attachmentIcon: ({ el, unmountPromise }) => {
              el.textContent = '[attachment content]';
              unmountPromise.then(() => {
                console.log('unmounting attachment icon');
              });
            },
          },
          {
            title: 'title',
            body: 'body',
            shortDetailText: 'extra',
            isRead: true,
            iconUrl: chrome.runtime.getURL('monkey.png'),
            onClick: function () {
              console.log('hi');
            },
          },
          {
            title: 'row uses icon html',
            body: 'body',
            shortDetailText: 'extra',
            isRead: false,
            iconHtml: '<div>x</div>',
            onClick: function () {
              console.log('hi');
            },
          },
          {
            title: 'row uses icon class',
            body: 'body',
            shortDetailText: 'extra',
            isRead: true,
            iconClass: 'test',
            onClick: function () {
              console.log('hi');
            },
            labels: [
              {
                backgroundColor: 'grey',
                foregroundColor: 'white',
                iconBackgroundColor: 'red',
                iconHtml: '<div>x</div>',
                title: 'pipeline name \u00b7 stage name \u00b7 box name',
                maxWidth: '200px',
              },
            ],
          },
          {
            title: 'title',
            body: 'body',
            shortDetailText: 'extra',
            isRead: true,
            iconUrl: chrome.runtime.getURL('monkey.png'),
            labels: [
              {
                backgroundColor: 'grey',
                foregroundColor: 'white',
                iconBackgroundColor: 'red',
                iconHtml: '<div>x</div>',
                title: 'icon html',
              },
              {
                backgroundColor: 'grey',
                foregroundColor: 'white',
                iconBackgroundColor: 'red',
                iconUrl: chrome.runtime.getURL('monkey.png'),
                title: 'icon url',
              },
              {
                backgroundColor: 'grey',
                foregroundColor: 'white',
                iconBackgroundColor: 'red',
                iconClass: 'test',
                title: 'icon class',
              },
            ],
            onClick: function () {
              console.log('hi');
            },
          },
          ...[true, false].flatMap((isTextRead) =>
            [true, false].map((isBackgroundread) => ({
              title: 'check read display',
              body: `text read? ${isTextRead} background read? ${isBackgroundread}`,
              isRead: {
                text: isTextRead,
                background: isBackgroundread,
              },
            })),
          ),
        ],
      });
    },
  );

  inboxSDK.Router.handleListRoute(
    inboxSDK.Router.NativeRouteIDs.SEARCH,
    function (listRouteView) {
      var section = listRouteView.addCollapsibleSection({
        title: 'Search Monkeys',
        tableRows: [
          {
            title: 'title',
            body: 'body',
            shortDetailText: 'extra',
            isRead: true,
            iconUrl: chrome.runtime.getURL('monkey.png'),
            onClick: function () {
              console.log('hi');
            },
          },
          {
            title: 'row uses icon html',
            body: 'body',
            shortDetailText: 'extra',
            isRead: true,
            iconHtml: '<div>x</div>',
            onClick: function () {
              console.log('hi');
            },
          },
          {
            title: 'row uses icon class',
            body: 'body',
            shortDetailText: 'extra',
            isRead: true,
            iconClass: 'test',
            onClick: function () {
              console.log('hi');
            },
            labels: [
              {
                backgroundColor: 'grey',
                foregroundColor: 'white',
                iconBackgroundColor: 'red',
                iconHtml: '<div>x</div>',
                title: 'pipeline name \u00b7 stage name \u00b7 box name',
                maxWidth: '200px',
              },
            ],
          },
          {
            title: 'title',
            body: 'body',
            shortDetailText: 'extra',
            isRead: true,
            iconUrl: chrome.runtime.getURL('monkey.png'),
            labels: [
              {
                backgroundColor: 'grey',
                foregroundColor: 'white',
                iconBackgroundColor: 'red',
                iconHtml: '<div>x</div>',
                title: 'icon html',
              },
              {
                backgroundColor: 'grey',
                foregroundColor: 'white',
                iconBackgroundColor: 'red',
                iconUrl: chrome.runtime.getURL('monkey.png'),
                title: 'icon url',
              },
              {
                backgroundColor: 'grey',
                foregroundColor: 'white',
                iconBackgroundColor: 'red',
                iconClass: 'test',
                title: 'icon class',
              },
            ],
            onClick: function () {
              console.log('hi');
            },
          },
          {
            title: 'wagon of monkeys',
            body: '2222',
            routeID: inboxSDK.Router.NativeRouteIDs.INBOX,
          },
        ],
      });

      section.on('expanded', console.log.bind(console, 'expanded'));
      section.on('collapsed', console.log.bind(console, 'collapsed'));
    },
  );
});
