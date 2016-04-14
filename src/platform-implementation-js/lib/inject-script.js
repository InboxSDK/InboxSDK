/* @flow */
//jshint ignore:start

import _ from 'lodash';
import Kefir from 'kefir';
import RSVP from 'rsvp';
import makeMutationObserverChunkedStream from './dom/make-mutation-observer-chunked-stream';

var fs = require('fs');

var injectScript: () => Promise = _.once(function() {
  if (!document.head.hasAttribute('data-inboxsdk-script-injected')) {
    var url = 'https://www.inboxsdk.com/build/injected.js';

    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.text = fs.readFileSync(__dirname+'/../../../dist/injected.js', 'utf8')+'\n//# sourceURL='+url+'\n';
    document.head.appendChild(script).parentNode.removeChild(script);
    document.head.setAttribute('data-inboxsdk-script-injected', 'true');
  }

  return Kefir.later(0, null)
    .merge( makeMutationObserverChunkedStream(document.head, {attributes: true}) )
    .filter(() => document.head.hasAttribute('data-inboxsdk-user-email-address'))
    .take(1)
    .map(() => null)
    .toPromise(RSVP.Promise);
});

export default injectScript;
