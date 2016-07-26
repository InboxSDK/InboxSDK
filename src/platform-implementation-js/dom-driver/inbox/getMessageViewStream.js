/* @flow */

import _ from 'lodash';
import Kefir from 'kefir';
import udKefir from 'ud-kefir';
import type InboxDriver from './inbox-driver';
import InboxMessageView from './views/inbox-message-view';

import finder from './detection/message/finder';
import watcher from './detection/message/watcher';
import parser from './detection/message/parser';

import detectionRunner from '../../lib/dom/detectionRunner';

const impStream = udKefir(module, imp);

function imp(driver: InboxDriver) {
  return detectionRunner({
    name: 'message',
    finder, watcher, parser,
    logError(err: Error, details?: any) {
      driver.getLogger().errorSite(err, details);
    }
  }).map(({el, removalStream, parsed}) => {
    const view = new InboxMessageView(el, driver, parsed);
    removalStream.take(1).onValue(() => {
      view.destroy();
    });
    return view;
  });
}

export default function getThreadViewStream(driver: InboxDriver) {
  return impStream.flatMapLatest(_imp => _imp(driver));
}
