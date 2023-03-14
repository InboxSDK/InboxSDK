/* @flow */

import logError from '../common/log-error';

import PlatformImplementationLoader from './loading/platform-implementation-loader';
import { BUILD_VERSION } from '../common/version';
import _loadScript from '../common/load-script';

export const LOADER_VERSION = BUILD_VERSION;
export const loadScript = _loadScript;
export function load(version: any, appId: string, opts: ?Object) {
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
    }
  );

  return PlatformImplementationLoader.load(appId, opts);
}

const pageOrigin: string =
  (process.env.NODE_ENV === 'test' && global.__test_origin) ||
  document.location.origin;

if (
  ['https://mail.google.com', 'https://inbox.google.com'].indexOf(pageOrigin) !=
  -1
) {
  PlatformImplementationLoader.preload();
}
