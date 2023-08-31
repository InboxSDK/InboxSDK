import { PlatformImplementationLoader as LOADER } from './loading/platform-implementation-loader';

LOADER.loadScript = async () =>
  await (
    await import(
      /* webpackMode: 'eager' */ './loading/load-platform-implementation-NONREMOTE'
    )
  ).loadPi(0)();
