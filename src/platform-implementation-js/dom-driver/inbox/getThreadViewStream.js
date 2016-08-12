/* @flow */

import _ from 'lodash';
import Kefir from 'kefir';
import type InboxDriver from './inbox-driver';
import InboxThreadView from './views/inbox-thread-view';

export default function getThreadViewStream(driver: InboxDriver, threadElStream: *) {
  return threadElStream.map(({el, removalStream, parsed}) => {
    const view = new InboxThreadView(el, driver, parsed);
    removalStream.take(1).onValue(() => {
      view.destroy();
    });
    return view;
  });
}
