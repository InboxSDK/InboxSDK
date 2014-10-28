Run `npm install` to install the necessary dependencies, and run `npm start` to
start the automatic builder. Then load `examples/hello-world/` as an unpacked
extension into Google Chrome.

The [Chrome Extensions
Reloader](https://chrome.google.com/webstore/detail/extensions-reloader/fimgfedafeadlieiabdeeaodndnlbhid)
extension is supported, and if it is detected then it will be triggered whenever
any changes are made to any SDK files, so that you don't have to click reload on
the test extension yourself on every change. (You'll still need to refresh
Gmail!)

By default, `npm start` builds a single bundle by running:

    gulp default --dev --watch --reloader`

Separate SDK and implementation bundles can be built and a local test server which hosts the remote implementation bundle can be started by running:

    gulp default server --watch --reloader`
