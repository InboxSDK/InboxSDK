function main() {
  var fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);

  var currentCompose = null;

  fileInput.addEventListener('change', function () {
    if (currentCompose && fileInput.files.length) {
      currentCompose.attachInlineFiles(fileInput.files);
    }
  });

  InboxSDK.load(2, 'Hello World!').then(function (sdk) {
    sdk.NavMenu.addNavItem({
      name: 'Test',
      onClick: function () {
        alert('hi');
      },
    });

    sdk.Router.handleAllRoutes(function (routeView) {
      console.log('got a routeView', routeView);
      console.log('routeType', routeView.getRouteType());
      console.log('routeID', routeView.getRouteID());
      console.log('params', routeView.getParams());
      routeView.on('destroy', function () {
        console.log('routeView destroyed', routeView.getRouteID());
      });
    });

    // the SDK has been loaded, now do something with it!
    sdk.Compose.registerComposeViewHandler(function (composeView) {
      currentCompose = composeView;
      composeView.on('destroy', function () {
        if (currentCompose === composeView) {
          currentCompose = null;
        }
      });

      // a compose view has come into existence, do something with it!
      composeView.addButton({
        title: 'My Nifty Button!',
        iconUrl: 'http://www.w3schools.com/html/html5.gif',
        onClick: function (event) {
          event.composeView.insertTextIntoBodyAtCursor('Hello World!');

          fileInput.value = '';
          fileInput.click();
        },
      });
    });

    console.log('user email', sdk.User.getEmailAddress());
    console.log('all user contacts', sdk.User.getAccountSwitcherContactList());

    var i = 0;

    window.makeMoleWidget = function () {
      var div = document.createElement('div');
      div.style.width = '200px';
      div.style.height = '400px';
      div.style.backgroundColor = 'red';

      var mole = sdk.Widgets.showMoleView({
        el: div,
        title: 'Mole Example ' + ++i,
      });

      div.onclick = function () {
        mole.close();
      };

      mole.on('destroy', console.log.bind(console, 'mole destroy'));
      mole.on('minimize', console.log.bind(console, 'mole minimize'));
      mole.on('restore', console.log.bind(console, 'mole restore'));
    };

    makeMoleWidget();

    sdk.Lists.registerThreadRowViewHandler(function (threadRowView) {
      threadRowView.addImage(
        Kefir.constant({
          imageUrl:
            'https://lh6.googleusercontent.com/-dSK6wJEXzP8/AAAAAAAAAAI/AAAAAAAAAAA/Som6EQiIJa8/s64-c/photo.jpg',
          tooltip: 'Monkeys',
        })
      );
    });
  });
}

if (window.top === window) {
  main();
}
