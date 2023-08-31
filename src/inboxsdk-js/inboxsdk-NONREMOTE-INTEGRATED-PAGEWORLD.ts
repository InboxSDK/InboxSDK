import nonremote from './inboxsdk-NONREMOTE';
import { setInjectScriptImplementation } from '../platform-implementation-js/lib/inject-script';
import loadScript from '../common/load-script';
import { injectScriptEmbedded } from '../platform-implementation-js/lib/inject-script-EMBEDDED';

setInjectScriptImplementation(injectScriptEmbedded);
nonremote._setLoadScript(loadScript);

export default nonremote;
