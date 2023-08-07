import { PlatformImplementationLoader as LOADER } from './loading/platform-implementation-loader';
import * as SDK from './inboxsdk';

LOADER.loadScript = async () =>
  await (
    await import(
      /* webpackMode: 'eager' */ './loading/load-platform-implementation-NONREMOTE'
    )
  ).loadPi(0)();

export default SDK;
