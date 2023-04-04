import LOADER from './loading/platform-implementation-loader';

LOADER._loadScript =
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('./loading/load-platform-implementation-DEV').default(0);

export default require('./inboxsdk');
