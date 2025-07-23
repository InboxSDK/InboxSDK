import * as InboxSDK from '@inboxsdk/core';

function log() {
  console.log.apply(
    console,
    ['thread-rows'].concat(Array.prototype.slice.call(arguments)),
  );
}

InboxSDK.load(2, 'thread-rows').then(function (inboxSDK) {
  window._sdk = inboxSDK;
  var i = 0;

  inboxSDK.Router.handleAllRoutes(function (routeView) {
    console.log('routeID', routeView.getRouteID());
    routeView.on('destroy', function () {
      console.log('routeView destroyed', routeView.getRouteID());
    });
  });

  inboxSDK.Lists.registerThreadRowViewSelectionHandler(() => {
    console.log('selected threads', inboxSDK.Lists.getSelectedThreadRowViews());
  });

  inboxSDK.Lists.registerThreadRowViewHandler(function (threadRowView) {
    var threadId = threadRowView.getThreadID();
    //console.log('threadRowView', threadId, threadRowView.getThreadIDIfStable(), threadRowView.getVisibleDraftCount(), threadRowView.getVisibleMessageCount(), threadRowView.getSubject());
    console.log('got threadRowView', new Date().toString());
    if (threadRowView.getVisibleMessageCount() == 0) {
      threadRowView.addLabel(
        Kefir.fromPromise(threadRowView.getDraftID()).map((id) => ({
          title: '' + id,
        })),
      );
    }

    threadRowView.addImage(
      Kefir.constant({
        imageUrl:
          'https://lh6.googleusercontent.com/-dSK6wJEXzP8/AAAAAAAAAAI/AAAAAAAAAAA/Som6EQiIJa8/s64-c/photo.jpg',
        tooltip: 'Monkeys',
        onHover(e) {
          console.log('hovered over image', e);
          e.hoverEnd.then(() => {
            console.log('hover ended');
          });
        },
      }),
    );

    threadRowView.addLabel(
      Kefir.repeatedly(5000, [
        { title: 'A' },
        {
          title: 'B',
          foregroundColor: 'blue',
          iconUrl: 'https://www.streak.com/build/images/pipelineIconMask.png',
        },
        { title: 'C', foregroundColor: 'red', iconClass: 'test_icon_thing' },
        { title: 'D', iconHtml: '<div>x</div>' },
        {
          title: 'pipeline name \u00b7 stage name \u00b7 box name',
          foregroundColor: 'red',
          iconClass: 'test_icon_thing',
          maxWidth: '200px',
        },
      ]).toProperty({ title: '0' }),
    );
    threadRowView.addLabel({
      title: 'a' + i++,
      iconUrl: 'https://www.streak.com/build/images/pipelineIconMask.png',
      backgroundColor: 'white',
      foregroundColor: 'blue',
      iconBackgroundColor: 'green',
    });

    threadRowView.addLabel({
      title: 'pipeline name \u00b7 stage name \u00b7 box name',
      iconUrl: 'https://www.streak.com/build/images/pipelineIconMask.png',
      backgroundColor: 'white',
      foregroundColor: 'blue',
      iconBackgroundColor: 'green',
      maxWidth: '200px',
    });

    const iconHtml =
      "<div style='width: 56px;height: 4px;background: aqua;'></div>";

    threadRowView.addAttachmentIcon({
      iconHtml,
      iconClass: 'icon-html-class',
      title: 'icon html',
    });

    threadRowView.addAttachmentIcon(
      Kefir.repeatedly(2000, [
        {
          iconClass: 'test_icon_thing',
          title: 'thing',
        },
        {
          iconUrl: 'https://ssl.gstatic.com/ui/v1/icons/mail/gplus.png',
          title: 'blah blah',
        },
        {
          iconHtml: '<div>x</div>',
          iconClass: 'icon-html-class',
          title: 'icon html',
        },
      ]),
    );
    threadRowView.replaceDraftLabel(
      Kefir.repeatedly(1000, [
        {
          text: 'Mail Merge',
          count: 420,
        },
        {
          text: 'foo',
        },
        null,
      ]),
    );
    var r = Math.random();
    threadRowView.replaceDate(
      r > 0.33
        ? {
            text: r > 0.66 ? 'Returning in: 6 months' : 'aaa',
            tooltip: 'foo of bar',
            textColor: 'green',
          }
        : null,
    );
    threadRowView.replaceDate(null);

    threadRowView.replaceSubject('This is a new subect!');

    // threadRowView.addButton(Kefir.repeatedly(5000, [
    // 	{
    // 		iconUrl: 'https://mailfoogae.appspot.com/build/images/listIndicatorDark.png',
    // 		iconClass: 'buttonLight'
    // 	},
    // 	{
    // 		iconClass: 'test_button_thing',
    // 	}
    // ]));

    threadRowView.addButton({
      iconClass: 'test_button_thing',
    });

    // adds a button that repeatedly updates, with and without a title
    threadRowView.addButton(Kefir.repeat(() => Kefir.sequentially(3000, [
      {
        title: 'Cake',
        iconUrl: 'https://raw.githubusercontent.com/google/material-design-icons/refs/heads/master/png/social/cake/materialiconsround/24dp/2x/round_cake_black_24dp.png',
        onClick: (event) => console.log('button click cake', event),
      },
      {
        title: 'Zap',
        iconUrl: 'https://raw.githubusercontent.com/google/material-design-icons/refs/heads/master/png/home/electric_bolt/materialiconsround/24dp/2x/round_electric_bolt_black_24dp.png',
        onClick: (event) => console.log('button click zap', event),
      },
      {
        iconUrl: 'https://raw.githubusercontent.com/google/material-design-icons/refs/heads/master/png/action/pets/materialiconsround/24dp/2x/round_pets_black_24dp.png',
        onClick: (event) => console.log('button click woof', event),
      },
    ])));

    var buttonBus = new Kefir.Bus();
    threadRowView.addButton(buttonBus.toProperty());
    buttonBus.emit({
      title: 'listIndicatorDark.png',
      iconUrl:
        'https://mailfoogae.appspot.com/build/images/listIndicatorDark.png',
      className: 'buttonLight',
      hasDropdown: true,
      onClick: function (event) {
        event.dropdown.el.innerHTML += 'beep <b>beep</b><br>aaa<br>aaaaaa';

        buttonBus.plug(
          Kefir.sequentially(1000, [
            null,
            {
              iconUrl:
                'https://mailfoogae.appspot.com/build/images/listIndicator.png',
              hasDropdown: true,
              onClick: function (event) {
                event.dropdown.el.innerHTML +=
                  'something new<p>new<p><b>more new';

                event.dropdown.on('unload', function () {
                  console.log('thread row button dropdown closed');
                });
                setTimeout(function () {
                  event.dropdown.close();
                }, 10000);
              },
            },
          ]),
        );
      },
    });

    threadRowView.addActionButton(
      Kefir.repeatedly(5000, [
        {
          type: inboxSDK.Lists.ActionButtonTypes.LINK,
          title: 'Take action',
          className: 'my-special-class',
          url: 'https://google.com',
          onClick(event) {
            console.log('onClick fired: ', event);
          },
        },
        {
          type: inboxSDK.Lists.ActionButtonTypes.LINK,
          title: 'Actions woo!',
          className: 'new-class',
          url: 'https://www.streak.com',
          onClick(event) {
            console.log('modified onClick fired: ', event);
          },
        },
      ]),
    );
  });
});
