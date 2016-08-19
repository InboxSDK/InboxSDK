/* @flow */
//jshint ignore:start

import _ from 'lodash';
import Kefir from 'kefir';
import RSVP from 'rsvp';
import makeMutationObserverChunkedStream from './dom/make-mutation-observer-chunked-stream';

var fs = require('fs');

// Returns a promise that resolves once the injected script has been injected
// and has done its initial load stuff.
const injectScript: () => Promise<null> = _.once(function() {
  if (!document.head.hasAttribute('data-inboxsdk-script-injected')) {
    const url = 'https://www.inboxsdk.com/build/injected.js';

    const script = document.createElement('script');
    script.type = 'text/javascript';

    const originalCode = fs.readFileSync(__dirname+'/../../../dist/injected.js', 'utf8');
    let disableSourceMappingURL = true;
    try {
      disableSourceMappingURL = localStorage.getItem('inboxsdk__enable_sourcemap') !== 'true';
    } catch(err) {
      console.error(err);
    }

    let codeParts = [];
    if (disableSourceMappingURL) {
      // Don't remove a data: URI sourcemap (used in dev)
      codeParts.push(originalCode.replace(/\/\/# sourceMappingURL=(?!data:)[^\n]*\n?$/, ''));
    } else {
      codeParts.push(originalCode);
    }
    codeParts.push('\n//# sourceURL='+url+'\n');

    const codeToRun = codeParts.join('');
    script.text = codeToRun;

    (document: any).head.appendChild(script).parentNode.removeChild(script);
    document.head.setAttribute('data-inboxsdk-script-injected', 'true');
  }

  return Kefir.later(0, null)
    .merge( makeMutationObserverChunkedStream(document.head, {attributes: true}) )
    .filter(() => document.head.hasAttribute('data-inboxsdk-user-email-address'))
    .take(1)
    .map(() => null)
    .toPromise(RSVP.Promise);
});

if (module.hot) {
  module.hot.decline();
}

export default injectScript;
