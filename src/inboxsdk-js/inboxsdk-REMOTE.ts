import loaderLoadScript from './loading/load-platform-implementation-REMOTE';
import { PlatformImplementationLoader } from './loading/platform-implementation-loader';
import loadScript from '../common/load-script';
import * as SDK from './inboxsdk';

PlatformImplementationLoader.loadScript = loaderLoadScript;

SDK._setLoadScript(loadScript);

export default SDK;
