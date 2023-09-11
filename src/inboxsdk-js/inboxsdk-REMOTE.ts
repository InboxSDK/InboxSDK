import { setLoadScript } from './load-script-proxy';
import './inboxsdk-REMOTE-setup';
import loadScript from '../common/load-script';
import * as SDK from './inboxsdk';

setLoadScript(loadScript);

export default SDK;
