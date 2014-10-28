Run `npm install` to install the necessary dependencies, and run `npm start` to
start the automatic builder. Then load `examples/hello-world/` as an unpacked
extension into Google Chrome.

The [Chrome Extensions
Reloader](https://chrome.google.com/webstore/detail/extensions-reloader/fimgfedafeadlieiabdeeaodndnlbhid)
extension is supported, and if it is detected then it will be triggered whenever
any changes are made to any SDK files, so that you don't have to click reload on
the test extension yourself on every change. (You'll still need to refresh
Gmail!)

By default, `npm start` builds a single bundle (--dev), watches it for changes
to trigger rebuilds (--watch), and tells Chrome to reload its extensions on
rebuilds (--reload) by running:

    gulp default --dev --watch --reloader

Separate SDK and implementation bundles can be built and a local test server
which hosts the remote implementation bundle can be started by running:

    gulp default server --watch --reloader

Building separate SDK and implementation bundles represents how the production
builds will work. The implementation bundle is loaded by eval() and not
associated with a file, which Chrome's debugger does not work as easily with, so
it's not recommended during general development of the GmailSDK.
