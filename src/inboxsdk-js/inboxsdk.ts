import { PlatformImplementationLoader } from './loading/platform-implementation-loader';
import { BUILD_VERSION } from '../common/version';
import { loadScript as _loadScript } from './load-script-proxy';
import type { LoadScriptOptions } from '../common/load-script';
import type { PiOpts } from '../platform-implementation-js/platform-implementation';

declare global {
  var __test_origin: string | undefined;
}

export const LOADER_VERSION = BUILD_VERSION;

/**
 * Only works in the non-npm remote-loaded build for MV2 extensions.
 * @deprecated
 */
export function loadScript(
  url: string,
  opts?: LoadScriptOptions,
): Promise<void> {
  return _loadScript(url, opts);
}

export function load(version: number, appId: string, opts?: Partial<PiOpts>) {
  opts = Object.assign(
    {
      // defaults
      globalErrorLogging: true,
    },
    opts,
    {
      // stuff that can't be overridden, such as extra stuff this file passes to
      // the implementation script.
      VERSION: LOADER_VERSION,
      REQUESTED_API_VERSION: version,
    },
  );

  return PlatformImplementationLoader.load(appId, opts);
}

const pageOrigin: string =
  (process.env.NODE_ENV === 'test' && global.__test_origin) ||
  document.location.origin;

if ('https://mail.google.com' === pageOrigin) {
  PlatformImplementationLoader.preload();
}
