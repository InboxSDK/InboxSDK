var _ = require('lodash');
var RSVP = require('rsvp');
var cproc = require('child_process');
var globp = RSVP.denodeify(require('glob'));

// Support Chrome Extensions Reloader
// https://chrome.google.com/webstore/detail/extensions-reloader/fimgfedafeadlieiabdeeaodndnlbhid

function getUserHome() {
  return process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
}

var userHasExtensionsReloaderInstalled = _.memoize(function() {
  var path = getUserHome() +
    '/Library/Application Support/Google/Chrome*/*/Extensions/fimgfedafeadlieiabdeeaodndnlbhid';
  return globp(path).then(function(results) {
    return results.length > 0;
  });
});

var getChromeLocation = _.memoize(function() {
  var path =
    '/Applications/Google Chrome*.app/Contents/MacOS/Google Chrome*';
  return globp(path).then(function(results) {
    return results[0];
  });
});

function extensionReload() {
  return userHasExtensionsReloaderInstalled().then(function(found) {
    if (found) {
      return getChromeLocation().then(function(chrome) {
        cproc.spawn(chrome, ["http://reload.extensions"]);
      });
    }
  });
}

module.exports = extensionReload;
