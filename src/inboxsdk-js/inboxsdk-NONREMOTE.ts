import shimLoadScript from './loading/load-platform-implementation-NONREMOTE';
import loader from './loading/platform-implementation-loader';

loader._loadScript = shimLoadScript(500);

import * as SDK from './inboxsdk';

export default SDK;
