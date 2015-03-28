import _ from 'lodash';
import Bacon from 'baconjs';
import RSVP from 'rsvp';
import makeMutationObserverChunkedStream from './dom/make-mutation-observer-chunked-stream';

var fs = require('fs');

const injectScript = _.once(function() {
  if (!document.head.hasAttribute('data-inboxsdk-script-injected')) {
    const url = 'https://www.inboxsdk.com/build/injected.js';

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.text = fs.readFileSync(__dirname+'/../../../dist/injected.js', 'utf8')+'\n//# sourceURL='+url+'\n';
    document.head.appendChild(script).parentNode.removeChild(script);
    document.head.setAttribute('data-inboxsdk-script-injected', true);
  }

  return Bacon.later(0, null)
    .merge( makeMutationObserverChunkedStream(document.head, {attributes: true}) )
    .filter(() => document.head.hasAttribute('data-inboxsdk-user-email-address'))
    .take(1)
    .map(() => null)
    .toPromise(RSVP.Promise);
});

export default injectScript;
