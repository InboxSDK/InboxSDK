import { injectScriptEmbedded } from './lib/inject-script-EMBEDDED';
import * as injecter from './lib/inject-script';

injecter.setInjectScriptImplementation(injectScriptEmbedded);

// eslint-disable-next-line @typescript-eslint/no-var-requires
export default require('./main').default;
