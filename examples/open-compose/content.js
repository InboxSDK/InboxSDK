import * as InboxSDK from '@inboxsdk/core';

InboxSDK.load(1, 'open-compose').then(function (inboxSDK) {
  inboxSDK.Compose.getComposeView().then(function (composeView) {
    composeView.setToRecipients(['oismail@gmail.com']);
  });
});
