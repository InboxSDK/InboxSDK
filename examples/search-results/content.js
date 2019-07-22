InboxSDK.load(1.0, 'search-example').then(function(inboxSDK){

  inboxSDK.Router.handleListRoute(inboxSDK.Router.NativeRouteIDs.SEARCH, function(listRouteView){

    var section = listRouteView.addCollapsibleSection({
      title: 'Monkeys',
      tableRows: [
        {
          title: 'title',
          body: 'body',
          shortDetailText: 'extra',
          isRead: true,
          iconUrl: chrome.runtime.getURL('monkey.png'),
          onClick: function(){
            console.log('hi');
          }
        },
        {
          title: 'row uses icon html',
          body: 'body',
          shortDetailText: 'extra',
          isRead: true,
          iconHtml: '<div>x</div>',
          onClick: function(){
            console.log('hi');
          }
        },
        {
          title: 'row uses icon class',
          body: 'body',
          shortDetailText: 'extra',
          isRead: true,
          iconClass: 'test',
          onClick: function(){
            console.log('hi');
          },
          labels: [
            {
              backgroundColor: 'grey',
              foregroundColor: 'white',
              iconBackgroundColor: 'red',
              iconHtml: '<div>x</div>',
              title: 'pipeline name \u00b7 stage name \u00b7 box name'
            }
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
              title: 'icon html'
            },
            {
              backgroundColor: 'grey',
              foregroundColor: 'white',
              iconBackgroundColor: 'red',
              iconUrl: chrome.runtime.getURL('monkey.png'),
              title: 'icon url'
            },
            {
              backgroundColor: 'grey',
              foregroundColor: 'white',
              iconBackgroundColor: 'red',
              iconClass: 'test',
              title: 'icon class'
            }
          ],
          onClick: function(){
            console.log('hi');
          }
        },
        {
          title: 'wagon of monkeys',
          body: '2222',
          routeID: inboxSDK.Router.NativeRouteIDs.INBOX
        }
      ]
    });

    section.on('expanded', console.log.bind(console, 'expanded'));
    section.on('collapsed', console.log.bind(console, 'collapsed'));
  });
});
