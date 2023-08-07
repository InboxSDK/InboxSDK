import { loadPi as shimLoaderLoadScript } from './loading/load-platform-implementation-NONREMOTE';
import { PlatformImplementationLoader } from './loading/platform-implementation-loader';
import * as SDK from './inboxsdk';

PlatformImplementationLoader.loadScript = shimLoaderLoadScript(0);

export default SDK;
