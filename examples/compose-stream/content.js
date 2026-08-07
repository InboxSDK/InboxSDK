import * as InboxSDK from '@inboxsdk/core';

InboxSDK.load(2, 'compose-stream-example').then((inboxSDK) => {
  window._sdk = inboxSDK;

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.multiple = true;
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);
  window._fileInput = fileInput;

  const dataUri =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAPCAIAAABr+ngCAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAHVJREFUeNpidNnZwkAuYGKgAFCm2VVKjwxtQF1AxARnkaQTwmBBE9r97BIx2iCAmSFAW5lXHM4HsoHo3ueXmNqQlUGsYYHbhmwqsiswfQR3HQuaEKYRWLWha8ZlBFZt2DVjGoEnCFnwhC3+kB/Y5EmJZoAAAwDdxywx4cg7qwAAAABJRU5ErkJggg==';

  window.openDraftByMessageID = function (messageID, opts) {
    return inboxSDK.Compose.openDraftByMessageID(messageID, opts);
  };

  // Gmail only parses `?compose=` on its own routes, so the SDK moves to a
  // native one to open the draft. Going back afterwards is the app's job — the
  // mole survives the navigation. Pass `routeID` to choose where it lands.
  async function openDraftFromCustomRoute(messageID) {
    const routeView = inboxSDK.Router.getCurrentRouteView();
    const previousRouteID = routeView.getRouteID();
    const previousParams = routeView.getParams();

    const composeView = await inboxSDK.Compose.openDraftByMessageID(messageID);

    inboxSDK.Router.goto(previousRouteID, previousParams);
    return composeView;
  }
  window.openDraftFromCustomRoute = openDraftFromCustomRoute;

  inboxSDK.Compose.registerComposeViewHandler(function (composeView) {
    console.log('thread id', composeView.getThreadID());

    window._lastComposeView = composeView;

    // Null for a brand new compose; set when an existing draft is opened, which
    // is the id openDraftFromCustomRoute needs to reopen it.
    const initialMessageID = composeView.getInitialMessageID();
    if (initialMessageID) {
      window._lastDraftMessageID = initialMessageID;
      console.log('initial message id', initialMessageID);
    }

    const monkeyImages = [
      chrome.runtime.getURL('monkey.png'),
      chrome.runtime.getURL('monkey-face.jpg'),
    ];
    let monkeyIndex = 0;

    composeView.addButton(
      Bacon.fromBinder((sinkFunction) => {
        let buttonOptions = {
          title: 'Monkeys!',
          iconUrl: monkeyImages[monkeyIndex],
          onClick(event) {
            monkeyIndex++;
            buttonOptions = {
              ...buttonOptions,
              iconUrl: monkeyImages[monkeyIndex % 2],
              iconClass: monkeyIndex % 2 ? 'special_style' : '',
            };

            if (monkeyIndex >= 2) {
              sinkFunction(null);
              setTimeout(() => {
                sinkFunction(buttonOptions);
              }, 2000);
            } else {
              sinkFunction(buttonOptions);
            }

            const element =
              event.composeView.insertHTMLIntoBodyAtCursor(
                '<b>monkey face</b>',
              );
            element.textContent = 'monkey time';
          },
          section: 'TRAY_LEFT',
        };

        sinkFunction(buttonOptions);

        return function () {};
      }),
    );

    composeView.addButton(
      Bacon.fromBinder(function (sink) {
        var buttonOptions = {
          title: 'no image',
          iconClass: 'cssbutton',
          onClick: function (event) {
            buttonOptions.iconClass =
              buttonOptions.iconClass === 'cssbutton'
                ? 'cssbutton afterclick'
                : 'cssbutton';
            sink(buttonOptions);
          },
        };
        sink(buttonOptions);
        return function () {};
      }),
    );

    composeView.addButton({
      title: 'Lion -1',
      iconUrl: chrome.runtime.getURL('lion.png'),
      orderHint: -1,
      onClick: function (event) {
        event.composeView.insertLinkIntoBodyAtCursor(
          'monkeys',
          'http://www.google.com',
        );
      },
    });

    composeView.addButton({
      title: 'text',
      iconUrl: chrome.runtime.getURL('lion.png'),
      onClick: function (event) {
        event.composeView.insertTextIntoBodyAtCursor(
          '<b>the xss guy\nfoo bar\nbar foo',
        );
      },
    });

    composeView.addButton({
      title: 'link chip',
      iconUrl: chrome.runtime.getURL('lion.png'),
      onClick: function (event) {
        event.composeView.insertLinkChipIntoBodyAtCursor(
          'name',
          'https://rpominov.github.io/kefir/',
          'https://cf.dropboxstatic.com/static/images/gmail_attachment_logo.png',
        );
      },
    });

    function dataURItoBlob(dataURI) {
      // convert base64/URLEncoded data component to raw binary data held in a string
      var byteString;
      if (dataURI.split(',')[0].indexOf('base64') >= 0)
        byteString = atob(dataURI.split(',')[1]);
      else byteString = unescape(dataURI.split(',')[1]);
      // separate out the mime component
      var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
      // write the bytes of the string to a typed array
      var ia = new Uint8Array(byteString.length);
      for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      return new Blob([ia], { type: mimeString });
    }

    composeView.addButton({
      title: 'Attach image from blob',
      iconUrl: dataUri,
      onClick(event) {
        const file = dataURItoBlob(dataUri);
        file.name = 'icon.png';
        composeView.attachFiles([file]);
      },
      section: 'SEND_RIGHT',
    });

    composeView.addButton({
      title: 'Attach image from file',
      iconUrl: dataUri,
      onClick(event) {
        fileInput.value = '';
        fileInput.click();
      },
      section: 'SEND_RIGHT',
    });

    composeView.addButton({
      title: 'add a new recipient',
      iconUrl: dataUri,
      onClick(event) {
        const pipelineRowContainer = document.createElement('div');
        const undoPipelineRow = composeView.addRecipientRow({
          el: pipelineRowContainer,
          labelClass: 'fooClass',
          labelText: 'some label',
        });
        document.getElementsByClassName('fX')[0].style.display = 'flex';
      },
      section: 'SEND_RIGHT',
    });

    Bacon.fromEventTarget(fileInput, 'change')
      .takeUntil(Bacon.fromEventTarget(composeView, 'destroy'))
      .onValue(() => {
        if (fileInput.files.length) {
          composeView.attachInlineFiles(fileInput.files);
        }
      });

    composeView.addButton({
      title: 'Changer',
      iconUrl: chrome.runtime.getURL('lion.png'),
      onClick: function (event) {
        composeView.setToRecipients(['to@example.com', 'to2@example.com']);
        composeView.setCcRecipients(['cc@example.com', 'cc2@example.com']);
        composeView.setBccRecipients(['bcc@example.com', 'bcc2@example.com']);

        console.log('current from was', composeView.getFromContact());
        var choices = composeView.getFromContactChoices();
        console.log('all from choices were', choices);
        composeView.setFromEmail(choices[choices.length - 1].emailAddress);
        console.log('new from is', composeView.getFromContact());
      },
      section: 'SEND_RIGHT',
    });

    composeView.on('destroy', console.log.bind(console, 'destroy'));
    composeView.on('destroy', function () {
      composeView.getDraftID().then(function (draftID) {
        console.log('destroyed, draftID =', draftID);
      });
    });
    composeView.on('presending', console.log.bind(console, 'presending'));
    composeView.on('sending', console.log.bind(console, 'sending'));
    composeView.on('sent', (event) => {
      (async () => {
        const [threadId, messageId] = await Promise.all([
          event.getThreadID(),
          event.getMessageID(),
        ]);
        console.log(`sent, threadId=${threadId}, messageId=${messageId}`);
      })();
    });
    composeView.on('sendCanceled', console.log.bind(console, 'sendCanceled'));

    composeView.on(
      'scheduleSendMenuOpening',
      console.log.bind(console, 'scheduleSendMenuOpening'),
    );
    composeView.on(
      'scheduleSendMenuOpenCanceled',
      console.log.bind(console, 'scheduleSendMenuOpenCanceled'),
    );

    composeView.on('subjectChanged', () => {
      console.log('subject changed', composeView.getSubject());
    });
    composeView.on('bodyChanged', () => {
      console.log('body changed', composeView.getTextContent());
    });
    composeView.on(
      'toContactAdded',
      console.log.bind(console, 'toContactAdded'),
    );
    composeView.on(
      'toContactRemoved',
      console.log.bind(console, 'toContactRemoved'),
    );
    composeView.on(
      'ccContactAdded',
      console.log.bind(console, 'ccContactAdded'),
    );
    composeView.on(
      'ccContactRemoved',
      console.log.bind(console, 'ccContactRemoved'),
    );
    composeView.on(
      'bccContactAdded',
      console.log.bind(console, 'bccContactAdded'),
    );
    composeView.on(
      'bccContactRemoved',
      console.log.bind(console, 'bccContactRemoved'),
    );
    composeView.on(
      'recipientsChanged',
      console.log.bind(console, 'recipientsChanged'),
    );
    composeView.on(
      'fromContactChanged',
      console.log.bind(console, 'fromContactChanged'),
    );

    composeView.on(
      'responseTypeChanged',
      console.log.bind(console, 'responseTypeChanged'),
    );

    composeView.on(
      'fullscreenChanged',
      console.log.bind(console, 'fullscreenChanged'),
    );
    composeView.on('minimized', console.log.bind(console, 'minimized'));
    composeView.on('restored', console.log.bind(console, 'restored'));
  });

  const OPEN_DRAFT_ROUTE_ID = 'compose-stream-example/open-draft';

  inboxSDK.NavMenu.addNavItem({
    name: 'Open draft from custom route',
    iconUrl: dataUri,
    routeID: OPEN_DRAFT_ROUTE_ID,
  });

  inboxSDK.Router.handleCustomRoute(OPEN_DRAFT_ROUTE_ID, (customRouteView) => {
    const input = document.createElement('input');
    input.size = 40;
    input.placeholder = 'draft message id';
    input.value = window._lastDraftMessageID || '';

    const openButton = document.createElement('button');
    openButton.textContent = 'Open draft';
    openButton.addEventListener('click', () => {
      openDraftFromCustomRoute(input.value.trim()).catch((err) => {
        console.error('failed to open draft', err);
      });
    });

    const container = document.createElement('div');
    container.appendChild(input);
    container.appendChild(openButton);

    customRouteView.getElement().appendChild(container);
  });

  var button = inboxSDK.Toolbars.addToolbarButtonForApp({
    iconUrl: dataUri,
    title: 'App Monkey',
    arrowColor: 'green',
    onClick(event) {
      console.log('app toolbar click', event);
      var div = document.createElement('div');
      div.textContent =
        'Hello World! Foo bar 1234567 filler text is here. Foo bar 1234567 filler text is here. Foo bar 1234567 filler text is here. Foo bar 1234567 filler text is here. Foo bar 1234567 filler text is here. Foo bar 1234567 filler text is here. Foo bar 1234567 filler text is here. Foo bar 1234567 filler text is here. Foo bar 1234567 filler text is here. Foo bar 1234567 filler text is here. Foo bar 1234567 filler text is here. Foo bar 1234567 filler text is here. Foo bar 1234567 filler text is here. Foo bar 1234567 filler text is here.';
      div.style.backgroundColor = 'green';

      event.dropdown.el.appendChild(div);
    },
  });
  window._button = button;
});
