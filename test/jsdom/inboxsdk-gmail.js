var assert = require('assert');
var RSVP = require('../lib/rsvp');
var jsdomDoc = require('../lib/jsdom-doc');

require('../lib/fake-page-globals')();

process.env.VERSION = 'beep';

global.MutationObserver = require('../lib/mock-mutation-observer');
global.document = jsdomDoc(`<!doctype html>
<html>
<body>
<div role="banner">
<div class="gb_w gb_ha" aria-label="Account Information" aria-hidden="false" tabindex="0" img-loaded="1"><div class="gb_J"><div>This account is managed by <b>streak.com</b>.</div><a class="gb_x" href="http://www.google.com/support/accounts/bin/answer.py?answer=181692&amp;hl=en" target="_blank">Learn more</a></div><div class="gb_z"><a class="gb_A gb_ec" href="https://plus.google.com/u/0/me?tab=mX&amp;authuser=0" target="_blank"><div class="gb_g gbip" title="Google+ Profile Icon"></div><span class="gb_C">Change photo</span></a><div class="gb_B"><div class="gb_D">Chris Cowan</div><div class="gb_E">cowan@streak.com</div><div class="gb_y"><a href="https://plus.google.com/u/0/me?tab=mX&amp;authuser=0" target="_blank">Profile</a>–<a href="http://www.google.com/intl/en/policies/privacy/" target="_blank">Privacy</a></div><a class="gb_bc gbp1 gb_a" href="https://myaccount.google.com/?utm_source=OGB&amp;authuser=0" target="_blank">My Account</a></div></div><div class="gb_K" aria-hidden="false"><a class="gb_L gb_O gb_P" target="_blank" rel="noreferrer"><img class="gb_Q" src="https://plus.google.com/u/0/_/focus/photos/public/AIbEiAIAAABECLTFjZCok6-J9wEiC3ZjYXJkX3Bob3RvKihkZjczYTJjY2M2ZmEzNzg0OTk0NzdlM2JmYjg4OWY0ZTNmOTFhZmNiMAEiaDfw7v26ir1rp345NanqFU_MhQ?sz=48" alt="Google+ Profile Icon"><div class="gb_N"><div class="gb_R">Chris Cowan</div><div class="gb_S">cowan@streak.com (default)</div></div></a><a class="gb_L" href="https://mail.google.com/mail/u/1" target="_blank" rel="noreferrer"><img class="gb_Q" src="https://plus.google.com/u/0/_/focus/photos/public/AIbEiAIAAABDCL_nn8ag5pLBGCILdmNhcmRfcGhvdG8qKGJmZjExYmU4ODA5YjhlNDc5OTdmMzhmZDI0YWEyMmUxNTdmNTYzNTIwAbWsPITWijXgBmbaAWa7V0IlI8KH?sz=48" alt="Google+ Profile Icon"><div class="gb_N"><div class="gb_R">Jonny Ive</div><div class="gb_S">streak.web.test.1@gmail.com</div></div></a></div><a class="gb_T gb_c" href="https://plus.google.com/u/0/dashboard" aria-hidden="true"><span class="gb_U gb_2"></span><div class="gb_V">All your Google+ pages ›</div></a><div class="gb_F"><div><a class="gb_9b gb_a" href="https://accounts.google.com/AddSession?hl=en&amp;continue=https://mail.google.com/mail&amp;service=mail" target="_blank">Add account</a></div><div><a class="gb_cc gb_jc gb_a" id="gb_71" href="https://mail.google.com/mail/logout?hl=en" target="_top">Sign out</a></div></div></div>
</div>
<div id="canvas"></div>
</body>
</html>`);
Object.defineProperty(document.location, 'origin', {value:'https://mail.google.com'});
global.window = document.parentWindow;

// don't try to inject ajax interceptor
document.head.setAttribute('data-inboxsdk-script-injected', true);
document.head.setAttribute('data-inboxsdk-user-email-address', 'cowan@streak.com');

var InboxSDK = require('./lib/inboxsdk');

var appOpts = {
  globalErrorLogging: false,
  TEMPORARY_INTERNAL_skipWeakMapRequirement: true // node 0.10 compat
};

assert.strictEqual(InboxSDK.LOADER_VERSION, 'beep');

InboxSDK.load(1, "sdk_testfoo_2a9c68f994", appOpts).then(function(inboxsdk) {
  assert.strictEqual(inboxsdk.LOADER_VERSION, 'beep');
  assert.strictEqual(inboxsdk.IMPL_VERSION, 'beep');
  assert.deepEqual(inboxsdk.User.getAccountSwitcherContactList(), [
    {name: 'Chris Cowan', emailAddress: 'cowan@streak.com'},
    {name: 'Jonny Ive', emailAddress: 'streak.web.test.1@gmail.com'}
  ]);

  assert.strictEqual(inboxsdk.User.getEmailAddress(), 'cowan@streak.com');

  RSVP.all([
    InboxSDK.load(1, 'sdk_testfoo2_c65cc8c168', appOpts),
    InboxSDK.load(1, 'sdk_testfoo3_fc90e29e45', appOpts)
  ]).then(function(apps) {
    assert.notStrictEqual(apps[0], apps[1]);
    assert.strictEqual(apps[0].LOADER_VERSION, 'beep');
    assert.strictEqual(apps[0].IMPL_VERSION, 'beep');
    assert.strictEqual(apps[1].LOADER_VERSION, 'beep');
    assert.strictEqual(apps[1].IMPL_VERSION, 'beep');

    process.exit(0);
  });
}).catch(err => {
  console.error("Error", err);
  process.exit(7);
});
