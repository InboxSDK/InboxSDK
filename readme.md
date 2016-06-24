# Build

Run `npm install` to install the necessary dependencies, and run `npm start` to
start the automatic builder. Then load `examples/hello-world/` as an unpacked
extension into Google Chrome.

The [Chrome Extensions
Reloader](https://chrome.google.com/webstore/detail/extensions-reloader/fimgfedafeadlieiabdeeaodndnlbhid)
extension is supported, and if it is detected then it will be triggered whenever
any changes are made to any SDK files, so that you don't have to click reload on
the test extension yourself on every change. (You'll still need to refresh
Gmail!)

By default, `npm start` runs the following command:

    gulp default --single --watch --reloader

which builds the SDK into a single bundle (`--single`), watches all of its
source files for changes to trigger rebuilds of the bundle automatically
(`--watch`), and tells Chrome to reload its extensions after SDK rebuilds
(`--reload`). (Note that in order to run gulp manually, you'll need to install
it globally by running `npm install -g gulp` first.)

The `-h` (`--hot`) flag is also available, which uses
[Browserify-HMR](https://github.com/AgentME/browserify-hmr) to make code
changes be hot-reloadable into a running extension.

Separate SDK and implementation bundles can be built and a local test server
which hosts the remote implementation bundle can be started by running:

    gulp default server --watch --reloader

Building separate SDK and implementation bundles represents how the production
builds will work. When using the local test server to host the
platform-implementation bundle, you'll need to run Chrome with the
`--allow-running-insecure-content` flag.

# Types

This project uses Facebook's Flow type checker (https://flowtype.org/). On
OS X, you can install it through brew (`brew install flow`). You can use the
`flow` command from within the repo to do type checking.

# Tests

This project has different kinds of unit tests and integration tests.

There are many unit tests which run under a single Javascript environment in
`test/*.js` files. These are executed by Mocha.

There are tests which each run under their own Javascript environments in
`test/jsdom/*.js` files. These are executed by the gulp task "test-jsdom".
Running `gulp test` will execute the jsdom tests and the above unit tests
together.

There are Selenium-based browser integration tests in `test/chrome/*.js` files.
These are the only tests which test the InboxSDK against the live Gmail and
Inbox sites. These tests require that the InboxSDK has been built first. These
tests can be run with `npm run test-browser`.

# Implementation Notes

When the `--single` flag isn't used, two javascript files are created:
inboxsdk.js and platform-implementation.js. inboxsdk.js implements the InboxSDK
object with the load method. It triggers an AJAX request for
platform-implementation.js which is evaluated and creates a
PlatformImplementation object.

The PlatformImplementation object instantiates either a GmailDriver or
InboxDriver object and uses it to do its DOM manipulations. The Driver object
is not directly exposed to the application.

## Gmail

CSS selectors should not depend on id values as these are uniquely
auto-generated at run-time. CSS class names are randomly strings, but they stay
the same long term over many sessions and are dependable for using to find
elements.

The account switcher widget in Gmail is built a bit differently, and the notes
about Inbox should be referred to instead for it.

## Inbox

Like Gmail, Inbox uses a lot of randomly generated class names, but the class
names appear to be regenerated every few weeks. CSS class names, id values,
jstcache properties, and jsl properties are not dependable for using to find
elements. The presence of the id and usually the class properties can be used.
CSS child and sibling selectors are useful to use.
