/* @flow */

import MockMutationObserver from '../test/lib/mock-mutation-observer';

process.env.VERSION = 'beep';

global.MutationObserver = MockMutationObserver;
(document.documentElement: any).innerHTML = `
<body>
<div id="canvas"></div>
</body>`;

global.__test_origin = 'https://inbox.google.com';

// don't try to inject ajax interceptor
(document.head: any).setAttribute('data-inboxsdk-script-injected', 'true');
(document.head: any).setAttribute(
  'data-inboxsdk-user-email-address',
  'foo@example.com'
);
(document.head: any).setAttribute('data-inboxsdk-user-name', 'Foo Bar');

const InboxSDK = require('../src/inboxsdk-js/inboxsdk-TEST').default;
//preload implementation
require('../src/platform-implementation-js/platform-implementation');

test('loads in inbox mock', () => {
  const appOpts = { globalErrorLogging: false, inboxBeta: true };

  expect(InboxSDK.LOADER_VERSION).toBe('beep');

  return InboxSDK.load(1, 'sdk_testfoo_2a9c68f994', appOpts).then(inboxsdk => {
    expect(inboxsdk.LOADER_VERSION).toBe('beep');
    expect(inboxsdk.IMPL_VERSION).toBe('beep');

    expect(inboxsdk.Router.getCurrentRouteView().getRouteType()).toBe(
      'UNKNOWN'
    );

    return Promise.all([
      InboxSDK.load(1, 'sdk_testfoo2_c65cc8c168', appOpts),
      InboxSDK.load(1, 'sdk_testfoo3_fc90e29e45', appOpts)
    ]).then(apps => {
      expect(apps[0]).not.toBe(apps[1]);
      expect(apps[0].LOADER_VERSION).toBe('beep');
      expect(apps[0].IMPL_VERSION).toBe('beep');
      expect(apps[1].LOADER_VERSION).toBe('beep');
      expect(apps[1].IMPL_VERSION).toBe('beep');
    });
  });
});
