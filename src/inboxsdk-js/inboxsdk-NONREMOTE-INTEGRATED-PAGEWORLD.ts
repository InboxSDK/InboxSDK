/* eslint-disable @typescript-eslint/no-var-requires */
import { injectScriptEmbedded } from '../platform-implementation-js/lib/inject-script-EMBEDDED';

require('../platform-implementation-js/lib/inject-script').setInjectScriptImplementation(
  injectScriptEmbedded
);

export default require('./inboxsdk-NONREMOTE').default;
