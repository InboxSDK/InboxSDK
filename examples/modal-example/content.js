/// <reference path="../types.d.ts" />

'use strict';

var div = document.createElement('div');
div.style.width = '800px';
div.style.height = '400px';
div.style.backgroundColor = 'red';

var sdk;

InboxSDK.load(1, 'modal-example', { inboxBeta: true }).then(function (
  inboxSDK
) {
  window.sdk = sdk = inboxSDK;

  sdk.Compose.registerComposeViewHandler((composeView) => {
    window._cv = composeView;

    const imageUri =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAPCAIAAABr+ngCAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAHVJREFUeNpidNnZwkAuYGKgAFCm2VVKjwxtQF1AxARnkaQTwmBBE9r97BIx2iCAmSFAW5lXHM4HsoHo3ueXmNqQlUGsYYHbhmwqsiswfQR3HQuaEKYRWLWha8ZlBFZt2DVjGoEnCFnwhC3+kB/Y5EmJZoAAAwDdxywx4cg7qwAAAABJRU5ErkJggg==';

    composeView.addButton({
      title: 'Open Drawer',
      iconUrl: imageUri,
      onClick(event) {
        const el = document.createElement('div');
        el.style.flex = '1';
        el.innerHTML = 'foo <div> blah </div>';
        const drawer = sdk.Widgets.showDrawerView({
          composeView,
          closeWithCompose: true,
          el,
          title: 'Drawer+Compose Test',
        });
        drawer.on('destroy', () => {
          console.log('drawer destroy');
        });
      },
      section: 'TRAY_LEFT',
    });
  });
});

var PRIMARY_BUTTON_OPTION = {
  type: 'PRIMARY_ACTION',
  text: 'Monkeys',
  onClick: function (e) {
    e.modalView.close();
  },
  orderHint: 5,
};

function showModal1() {
  let el = div.cloneNode(true);
  el.style.backgroundColor = 'green';
  var modal = (window._modal = sdk.Widgets.showModalView({
    el: el,
    chrome: true,
    buttons: [
      PRIMARY_BUTTON_OPTION,
      {
        text: 'Monkeys 2',
        onClick: function () {
          alert('bye');
        },
        orderHint: 10,
      },
      {
        text: 'Monkeys 3',
        onClick: function () {
          alert('bye');
        },
        orderHint: 0,
      },
    ],
  }));
  modal.on('destroy', function () {
    console.log('modal destroy');
  });
}

function showModal2() {
  let el = div.cloneNode(true);
  el.style.backgroundColor = 'blue';
  var modal = (window._modal = sdk.Widgets.showModalView({
    el: el,
    buttons: [PRIMARY_BUTTON_OPTION],
  }));
}

function showModal3() {
  let el = div.cloneNode(true);
  el.style.backgroundColor = 'orange';
  var modal = (window._modal = sdk.Widgets.showModalView({
    el: el,
    chrome: false,
  }));
}

function showModal4() {
  let el = div.cloneNode(true);
  el.style.backgroundColor = 'yellow';
  var modal = (window._modal = sdk.Widgets.showModalView({
    el: el,
    chrome: false,
    buttons: [PRIMARY_BUTTON_OPTION],
  }));
}

function showModal5() {
  let el = div.cloneNode(true);
  el.style.backgroundColor = 'black';
  var modal = (window._modal = sdk.Widgets.showModalView({
    el: el,
    chrome: false,
    showCloseButton: true,
  }));
}

function showModal6() {
  let el = div.cloneNode(true);
  el.style.backgroundColor = 'fuscia';
  var modal = (window._modal = sdk.Widgets.showModalView({
    el: el,
    chrome: false,
    buttons: [PRIMARY_BUTTON_OPTION],
    showCloseButton: true,
  }));

  setTimeout(function () {
    modal.close();
  }, 5000);
}

function showModal7() {
  let el = div.cloneNode(true);
  el.style.backgroundColor = 'purple';
  var modal = (window._modal = sdk.Widgets.showModalView({
    el: div,
    buttons: [],
  }));
}

// with constrainTitleWidth
function showModal8() {
  let el = div.cloneNode(true);
  el.style.backgroundColor = 'purple';
  var modal = (window._modal = sdk.Widgets.showModalView({
    el: div,
    constrainTitleWidth: true,
    title:
      'The quick brown fox jumps over the lazy dog. The quick brown fox jumps over the lazy dog. The quick brown fox jumps over the lazy dog. The quick brown fox jumps over the lazy dog. The quick brown fox jumps over the lazy dog.',
    buttons: [],
  }));
}

// without constrainTitleWidth
function showModal9() {
  let el = div.cloneNode(true);
  el.style.backgroundColor = 'purple';
  var modal = (window._modal = sdk.Widgets.showModalView({
    el: div,
    title:
      'The quick brown fox jumps over the lazy dog. The quick brown fox jumps over the lazy dog. The quick brown fox jumps over the lazy dog. The quick brown fox jumps over the lazy dog. The quick brown fox jumps over the lazy dog.',
    buttons: [],
  }));
}

function showDrawer1() {
  const el = document.createElement('div');
  el.style.height = '100%';
  el.style.background = 'blue';
  el.innerHTML = 'foo <button type="button">open compose</button>';

  const drawer = (window._drawer = sdk.Widgets.showDrawerView({
    el,
    title: 'Drawer Test',
  }));

  el.querySelector('button').addEventListener('click', () => {
    sdk.Compose.openNewComposeView().then((cv) => {
      drawer.associateComposeView(cv, false);
    });
  });

  drawer.on('preautoclose', (event) => {
    console.log('preautoclose');
  });
  drawer.on('slideAnimationDone', () => {
    console.log('slideAnimationDone');
  });
  drawer.on('closing', () => {
    console.log('closing');
  });
  drawer.on('destroy', () => {
    console.log('destroy');
    // simulating a real application unmounting a React component.
    // important that this happens after the drawer is already out of view.
    el.innerHTML = '';
  });
}
