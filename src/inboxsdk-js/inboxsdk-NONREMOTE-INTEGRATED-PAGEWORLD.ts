import { setInjectScriptImplementation } from '../platform-implementation-js/lib/inject-script';
import loadScript from '../common/load-script';
import { injectScriptEmbedded } from '../platform-implementation-js/lib/inject-script-EMBEDDED';
import nonremote from './inboxsdk-NONREMOTE';

setInjectScriptImplementation(injectScriptEmbedded);
nonremote._setLoadScript(loadScript);

export default nonremote;
