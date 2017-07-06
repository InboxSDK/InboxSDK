/* @flow */

const _ = require('lodash');
const RSVP = require('rsvp');
const cproc = require('child_process');
const globp = RSVP.denodeify(require('glob'));

// Support Chrome Extensions Reloader
// https://chrome.google.com/webstore/detail/extensions-reloader/fimgfedafeadlieiabdeeaodndnlbhid

function getUserHome(): string {
  const userHome = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
  if (!userHome) {
    throw new Error("Could not determine user home directory");
  }
  return userHome;
}

// Returns null if no Chrome profiles have the extension installed. If it the
// extension is installed, it returns the name of Chrome name suffix (such as
// "", " Canary", etc).
const getchromeSuffixWithReloaderExtension = _.once(function() {
  const path = getUserHome() +
    '/Library/Application Support/Google/Chrome*/*/Extensions/fimgfedafeadlieiabdeeaodndnlbhid';
  return globp(path).then(function(results) {
    const path = results[0];
    if (path) {
      return path.match(/Chrome([^/]*)\//)[1];
    }
    return null;
  });
});

const getChromeLocation = _.memoize(function(chromeSuffix) {
  if (!chromeSuffix) {
    chromeSuffix = '';
  }
  const path =
    '/Applications/Google Chrome'+chromeSuffix+'.app/Contents/MacOS/Google Chrome*';
  return globp(path).then(function(results) {
    return results[0];
  });
});

export default function extensionReload() {
  return getchromeSuffixWithReloaderExtension().then(function(chromeSuffix) {
    if (chromeSuffix != null) {
      return getChromeLocation(chromeSuffix).then(function(chrome) {
        if (chrome) {
          cproc.spawn(chrome, ["http://reload.extensions"]);
        }
      });
    }
  });
}
