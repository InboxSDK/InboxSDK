/* @flow */

import assign from 'lodash/object/assign';
import logError from '../common/log-error';

import PlatformImplementationLoader from './loading/platform-implementation-loader';
import checkRequirements from './check-requirements';
import {BUILD_VERSION} from '../common/version';
import loadScript from '../common/load-script';

const InboxSDK = {
  LOADER_VERSION: BUILD_VERSION,
  loadScript,
  load(version: any, appId: string, opts: ?Object) {
    opts = assign({
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

if (['https://mail.google.com', 'https://inbox.google.com'].indexOf(document.location.origin) != -1) {
  PlatformImplementationLoader.preload();
}

export default InboxSDK;
