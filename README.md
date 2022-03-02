[**InboxSDK** - Main Site](https://www.inboxsdk.com/)

# Documentation

https://inboxsdk.github.io/inboxsdk-docs/

[Original mailing list](https://groups.google.com/g/inboxsdk/) (inactive, superseded by the Issues tracker here) 

# Usage

See https://github.com/InboxSDK/hello-world for an example extension using the InboxSDK.

# Licensing

This release of the InboxSDK is distributed under the terms of both the MIT license and the Apache License (Version 2.0). The InboxSDK may be used and redistributed according to the terms of either license. These are permissive licenses that do not require modifications or embedding applications to be open source themselves. See [LICENSE-APACHE.txt](LICENSE-APACHE.txt), [LICENSE-MIT.txt](LICENSE-MIT.txt), and [COPYRIGHT.txt](COPYRIGHT.txt) for details.

# Contribution Guidelines

Please feel free to open issues or pull requests for bug fixes. For feature requests, please open an issue first so we can decide if and how we may want to support the feature. Many features require ongoing maintenance to support as Gmail changes, and we may not want to commit to supporting every requested feature. If we decide not to implement a feature, we may be able to find a way to implement functionality in the InboxSDK to help applications implement the feature themselves.

# Development Cycle Essentials

Run `yarn` to install the necessary dependencies, and run `yarn start` to
start the automatic builder. Then load `examples/hello-world/` as an unpacked
extension into Google Chrome.

The [Chrome Extensions
Reloader](https://chrome.google.com/webstore/detail/extensions-reloader/fimgfedafeadlieiabdeeaodndnlbhid)
extension is supported, and if it is detected then it will be triggered whenever
any changes are made to any SDK files, so that you don't have to click reload on
the test extension yourself on every change. (You'll still need to refresh
Gmail!)

When you are working on the InboxSDK, you should test with one of the example
extensions in the examples directory. If you are working on a specific feature,
find an example extension that uses that feature, or edit a relevant example to
use the feature. If you are adding a new feature to the InboxSDK, make one of
the examples use the new feature. The new feature should be easily usable in
isolation in an example extension, and must not depend on Streak (including
Streak's CSS). Any new features that add elements controlled by the extension
ought to be styled (positioned) reasonably by the InboxSDK without requiring
the extension to include its own non-trivial CSS.

## Technology Choices

We're trying to use Typescript as much as possible now. There are still a lot of classic Javascript and Flow Javascript files left over. As needed, you can make `.d.ts` type-def files so Typescript can see them, and you can make `.js.flow` type-def files so Flow can see Typescript files. If you're working on a bit of code that's not in a Typescript file, consider changing the file to be Typescript.

React is done for some UIs, but there's a complication to using it generally: we often need to integrate with elements from Gmail itself or other instances of the InboxSDK. React only works well for the case where there are a lot of elements created and managed by the InboxSDK itself, we have many places where we have to integrate with outside elements, and most of our additions into the page are pretty simple DOM-wise, so we're pretty picky about where we use React.

## Fixing Unreproducible Bugs

Gmail frequently delivers rolling updates to users, so that a small percent of
users run different versions of Gmail than most people. These different
versions of Gmail may visually appear the same but contain internal differences
(HTML structure, ajax request/response formats, etc.) that cause
compatibility issues for the InboxSDK.

In general, we should try to add error logging that makes it obvious whenever
Gmail's HTML structure or ajax formats aren't what we expect. For example, if
we have code that calls `.querySelector(...)` on an element and then requires
an element to be returned, we should either import and use
'querySelectorOrFail.js' (which throws an error with a useful message if no
element is found), or we should handle null being returned from
`.querySelector(...)` with code like the following:

```js
const insertionPointEl = el.querySelector('.foo .bar');
if (!insertionPointEl) {
  const err = new Error('Could not find FOO element');
  driver.getLogger().errorSite(err);
  throw err; // or instead of throwing, do some graceful fallback instead.
}
```

If we started seeing that error in our logs, and we weren't able to reproduce
the issue locally, then you can log the HTML of the unexpectedly-different
element by passing an object as the details parameter to any of Logger's
methods. Whenever we log HTML of elements in Gmail, we must either use an HTML
censoring function (so we don't risk getting users' message contents; use
either `censorHTMLstring(el.outerHTML)`, or `censorHTMLtree(el)` if information
about the element's parents is useful too), or restrict the logging to only
happen for Streak users (by checking the extension's appId with the
`isStreakAppId.js` function). Same rule of thumb applies for logging ajax
request/responses too (see `censorJSONTree`).

See the _Querying for Error Logs_ section below for instructions on reading the
logged errors and their details.

Whenever we update our code for a new Gmail version that isn't completely
rolled out, we need to make sure our code continues to support previous
versions of Gmail. The best way to guarantee this is to create a unit test
which runs the code on all known versions of the HTML. (Ideally, the unit test
should even work on the censored HTML directly from an error report! Maybe in
the future for specific errors, we could automate the process of taking the censored HTML from an error report and creating a new failing test case using
it.)

---

# Build Options

By default, `yarn start` runs the following command:

    yarn gulp default --watch --reloader

which builds the SDK, watches all of its source files for changes to trigger rebuilds of the bundle automatically (`--watch`), and tells Chrome to reload its extensions after SDK rebuilds (`--reload`).

Separate SDK and implementation bundles can be built and a local test server
which hosts the remote implementation bundle can be started by running:

    yarn gulp default server --watch --reloader

Building separate SDK and implementation bundles represents how the production
builds will work. When using the local test server to host the
platform-implementation bundle, you'll need to run Chrome with the
`--allow-running-insecure-content` flag.

# Tests

This project has different kinds of unit tests and integration tests.

All .js files under `__tests__` and all `*.test.js` files are tests executed by
Jest. All new tests should be Jest tests.

The `*.test.js` files inside of `test/chrome` are Puppeteer-based integration tests.
These tests open a browser with a test InboxSDK extension and test that various
InboxSDK features work correctly in Gmail. These tests are primarily about checking
whether Gmail has broken support with us, and our CI system runs these for us. These
tests require that the InboxSDK has been built first and that the
".inboxsdk_test_secret" file or the INBOXSDK_TEST_SECRET environment variable
contains the decryption key for the Google test account credentials. These
tests can be run with `yarn puppeteer`.

# Implementation Notes

## Build

When the `--remote` flag is used, two main javascript files are created:
inboxsdk.js and platform-implementation.js. inboxsdk.js implements the InboxSDK
object with the load method. It triggers an AJAX request for
platform-implementation.js which is evaluated and creates a
PlatformImplementation object.

## Paths

### src/inboxsdk-js/

This contains the code for the global `InboxSDK` object with the `load` and
`loadScript` methods.

### src/platform-implementation-js/

This is the code that the InboxSDK loader fetches from our server.

When it's executed, it defines a global object containing a function that
instantiates a PlatformImplementation object. Calls to `InboxSDK.load` return a
promise that resolves to this object. This object is the object given to the
extension.

The PlatformImplementation object instantiates either a GmailDriver or
InboxDriver object and uses it to do its DOM manipulations. The Driver object
is not directly exposed to the application. This pattern is used often. For
example, each Driver object has a getComposeViewDriverStream() method which
returns a Kefir stream of objects following the ComposeViewDriver interface.
The PlatformImplementation's Compose object takes the ComposeViewDriver object
and instantiates a ComposeView object wrapping it, adding some logic common to
both Gmail and Inbox, and this ComposeView object is what is exposed to the
extension.

### src/injected-js/

This code ultimately ends up inside of platform-implementation.js. Unlike the
rest of the code, it's executed within Gmail's environment instead of the
extension's environment. This allows it to access global Gmail variables, and
to intercept Gmail's AJAX connections (see xhr-proxy-factory). It communicates
with the InboxSDK code in the extension environment through DOM events.

InboxSDK code within Gmail's environment has less coverage from our error
tracking system, and is more vulnerable to being affected by or affecting
Gmail's own Javascript variables, so we try to minimize what functionality
lives in the injected script.

The file "src/injected-js/main.js" is browserified into "dist/injected.js",
which is then included by "src/platform-implementation-js/lib/inject-script.js"
and built into "dist/platform-implementation.js".

## Element Detection Notes

### Gmail

CSS selectors should not depend on id values as these are uniquely
auto-generated at run-time. CSS class names are randomly strings, but they stay
the same long term over many sessions and are dependable for using to find
elements.

The account switcher widget in Gmail is built a bit differently, and the notes
about Inbox should be referred to instead for it.

### ~~Inbox~~ Modern Google

(Inbox support is no more, but this knowledge is true of some newer Google web
app code and parts of Gmail.)

Like Gmail, Inbox uses a lot of randomly generated class names, but the class
names appear to be regenerated every few weeks. CSS class names, id values,
jstcache properties, and jsl properties are not dependable for using to find
elements. The presence of the id and usually the class properties can be used.
CSS child and sibling selectors are useful to use.

## Gmail Response Processor Utilities

You can use the `./tools/serialize.js` and `./tools/deserialize.js` executables
to (de)serialize Gmail messages from the command line. You need to have
babel-cli installed globally (`yarn global add babel-cli`) for them to work. Each one
reads from stdin and writes to stdout.

If you have a file of JSON containing the Gmail response, you can use `jq`
(`brew install jq`) to read the string out of the JSON and pipe it into
deserialize:

    jq -j '.input' ./test/data/gmail-response-processor/suggestions.json | ./tools/deserialize.js