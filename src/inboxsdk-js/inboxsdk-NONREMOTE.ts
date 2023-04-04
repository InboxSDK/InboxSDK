import shimLoadScript from './loading/load-platform-implementation-DEV';
import loader from './loading/platform-implementation-loader';

loader._loadScript = shimLoadScript(500);

export default require('./inboxsdk');
