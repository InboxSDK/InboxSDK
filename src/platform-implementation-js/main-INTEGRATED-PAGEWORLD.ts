/* eslint-disable @typescript-eslint/no-var-requires */
import { injectScriptEmbedded } from './lib/inject-script-EMBEDDED';
import * as injecter from './lib/inject-script';

injecter.setInjectScriptImplementation(injectScriptEmbedded);

export default require('./main').default;
