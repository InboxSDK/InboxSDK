import loaderLoadScript from './loading/load-platform-implementation-REMOTE';
import loader from './loading/platform-implementation-loader';
import loadScript from '../common/load-script';

loader._loadScript = loaderLoadScript;

import * as SDK from './inboxsdk';

SDK._setLoadScript(loadScript);

export default SDK;
