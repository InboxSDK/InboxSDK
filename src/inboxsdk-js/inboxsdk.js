/* @flow */

import logError from '../common/log-error';

import PlatformImplementationLoader from './loading/platform-implementation-loader';
import checkRequirements from './check-requirements';
import {BUILD_VERSION} from '../common/version';
import loadScript from '../common/load-script';

const InboxSDK = {
  LOADER_VERSION: BUILD_VERSION,
  loadScript,
  load(version: any, appId: string, opts: ?Object) {
    opts = Object.assign({
      // defaults
      globalErrorLogging: true
    }, opts, {
      // stuff that can't be overridden, such as extra stuff this file passes to
      // the implementation script.
      VERSION: InboxSDK.LOADER_VERSION,
      REQUESTED_API_VERSION: version
    });

    checkRequirements(opts);

    return PlatformImplementationLoader.load(appId, opts);
  }
};

const pageOrigin: string = (process.env.NODE_ENV === 'test' && global.__test_origin) || document.location.origin;

if (['https://mail.google.com', 'https://inbox.google.com'].indexOf(pageOrigin) != -1) {
  PlatformImplementationLoader.preload();
}

export default InboxSDK;
