import { PlatformImplementationLoader } from './loading/platform-implementation-loader';
import { BUILD_VERSION } from '../common/version';

declare global {
  var __test_origin: string | undefined;
}

export const LOADER_VERSION = BUILD_VERSION;
export let loadScript: Function = () => {
  throw new Error('This function is not usable in Chrome MV3 extensions.');
};
// TODO make this not be publicly exposed and callable
export function _setLoadScript(fn: Function) {
  loadScript = fn;
}
export function load(version: any, appId: string, opts: any) {
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

if ('https://mail.google.com' === pageOrigin) {
  PlatformImplementationLoader.preload();
}
