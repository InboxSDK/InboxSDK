import once from 'lodash/once';
import memoize from 'lodash/memoize';
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
const getchromeSuffixWithReloaderExtension = once(
  async (): Promise<string | void> => {
    const path =
      getUserHome() +
      '/Library/Application Support/Google/Chrome*/*/Extensions/fimgfedafeadlieiabdeeaodndnlbhid';
    const results = await fg([path], { onlyDirectories: true });
    const firstResult = results[0];
    if (firstResult) {
      return firstResult.match(/Chrome([^/]*)\//)![1];
    }
    return undefined;
  }
);

const getChromeLocation = memoize(
  async (chromeSuffix: string): Promise<string | void> => {
    const path =
      '/Applications/Google Chrome' +
      chromeSuffix +
      '.app/Contents/MacOS/Google Chrome*';
    const results = await fg([path]);
    return results[0];
  }
);

export default async function extensionReload(): Promise<void> {
  const chromeSuffix = await getchromeSuffixWithReloaderExtension();
  if (chromeSuffix != null) {
    const chrome = await getChromeLocation(chromeSuffix);
    if (chrome) {
      cproc.spawn(chrome, ['http://reload.extensions']);
    }
  }
}
