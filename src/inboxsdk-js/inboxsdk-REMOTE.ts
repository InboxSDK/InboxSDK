import loadScript from './loading/load-platform-implementation-REMOTE';
import loader from './loading/platform-implementation-loader';

loader._loadScript = loadScript;

import * as SDK from './inboxsdk';

export default SDK;
