/* @flow */

import _ from 'lodash';
import cproc from 'child_process';
import fg from 'fast-glob';

// Support Chrome Extensions Reloader
// https://chrome.google.com/webstore/detail/extensions-reloader/fimgfedafeadlieiabdeeaodndnlbhid

function getUserHome(): string {
  const userHome =
    process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
  if (!userHome) {
    throw new Error('Could not determine user home directory');
  }
  return userHome;
}

// Returns null if no Chrome profiles have the extension installed. If it the
// extension is installed, it returns the name of Chrome name suffix (such as
// "", " Canary", etc).
const getchromeSuffixWithReloaderExtension = _.once(() => {
  const path =
    getUserHome() +
    '/Library/Application Support/Google/Chrome*/*/Extensions/fimgfedafeadlieiabdeeaodndnlbhid';
  return fg([path], { onlyDirectories: true }).then(results => {
    const path = results[0];
    if (path) {
      return path.match(/Chrome([^/]*)\//)[1];
    }
    return null;
  });
});

const getChromeLocation = _.memoize(chromeSuffix => {
  if (!chromeSuffix) {
    chromeSuffix = '';
  }
  const path =
    '/Applications/Google Chrome' +
    chromeSuffix +
    '.app/Contents/MacOS/Google Chrome*';
  return fg([path]).then(function(results) {
    return results[0];
  });
});

export default function extensionReload() {
  return getchromeSuffixWithReloaderExtension().then(function(chromeSuffix) {
    if (chromeSuffix != null) {
      return getChromeLocation(chromeSuffix).then(function(chrome) {
        if (chrome) {
          cproc.spawn(chrome, ['http://reload.extensions']);
        }
      });
    }
  });
}
