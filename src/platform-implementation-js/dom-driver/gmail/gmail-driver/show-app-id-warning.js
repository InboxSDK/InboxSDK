'use strict';

import Bacon from 'baconjs';
import baconCast from 'bacon-cast';

import fakeWindowResize from '../../../lib/fake-window-resize';

export default function showAppIdWarning(driver) {



  const topDiv = document.createElement('div');
  topDiv.className = 'inboxsdk__appid_warning';
  topDiv.innerHTML = `
<div class="inboxsdk__appid_warning_main">
  <div class="topline">InboxSDK Developer Warning: Invalid AppId</div>
  <div>You've loaded the InboxSDK with an unregistered appId. Registration is free but necessary to load the SDK.</div>
</div>
<a class="inboxsdk__appid_register" target="_blank" href="https://www.inboxsdk.com/register">Register Your App</a>
<input type="button" value="" title="Close" class="inboxsdk__x_close_button" />
`;

 const topMessageBarDriver = driver.createTopMessageBarDriver(baconCast(Bacon, {el: topDiv}));

  topDiv.querySelector('.inboxsdk__x_close_button')
    .addEventListener('click', function(e) {
      topMessageBarDriver.remove();
    });

}
