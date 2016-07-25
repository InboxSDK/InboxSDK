/* @flow */
//jshint ignore:start

import _ from 'lodash';
import Kefir from 'kefir';
import udKefir from 'ud-kefir';
import type InboxDriver from './inbox-driver';
import InboxThreadView from './views/inbox-thread-view';

import finder from './detection/thread/finder';
import watcher from './detection/thread/watcher';
import parser from './detection/thread/parser';

import detectionRunner from '../../lib/dom/detectionRunner';

const impStream = udKefir(module, imp);

function imp(driver: InboxDriver) {
  return detectionRunner({
    name: 'thread',
    finder, watcher, parser,
    logError(err: Error, details?: any) {
      driver.getLogger().errorSite(err, details);
    }
  }).map(({el, removalStream, parsed}) => {
    const view = new InboxThreadView(el, driver, parsed);
    removalStream.take(1).onValue(() => {
      view.destroy();
    });
    return view;
  });
}

export default function getThreadViewStream(driver: InboxDriver) {
  return impStream.flatMapLatest(_imp => _imp(driver));
}
