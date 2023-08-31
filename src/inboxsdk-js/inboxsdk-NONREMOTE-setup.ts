import { loadPi as shimLoaderLoadScript } from './loading/load-platform-implementation-NONREMOTE';
import { PlatformImplementationLoader } from './loading/platform-implementation-loader';

PlatformImplementationLoader.loadScript = shimLoaderLoadScript(500);
