/* @flow */
//jshint ignore:start

import _ from 'lodash';
import Kefir from 'kefir';
import udKefir from 'ud-kefir';
import censorHTMLtree from '../../../common/censor-html-tree';
import InboxComposeView from './views/inbox-compose-view';
import type ItemWithLifetimePool from '../../lib/ItemWithLifetimePool';
import type InboxDriver from './inbox-driver';

import finder from './detection/compose/finder';
import watcher from './detection/compose/watcher';
import parser from './detection/compose/parser';

import detectionRunner from '../../lib/dom/detectionRunner';

const impStream = udKefir(module, imp);

function imp(driver: InboxDriver, threadElPool: ItemWithLifetimePool<*>): Kefir.Observable<InboxComposeView> {
  return detectionRunner({
    name: 'compose',
    finder, watcher: root => watcher(root, threadElPool), parser,
    logError(err: Error, details?: any) {
      driver.getLogger().errorSite(err, details);
    }
  })
    .map(({el, removalStream, parsed}) => {
      const view = new InboxComposeView(driver, el, parsed);
      removalStream.take(1).onValue(() => view.destroy());
      return view;
    });
}

export default function getComposeViewDriverStream(driver: InboxDriver, threadElPool: ItemWithLifetimePool<*>): Kefir.Observable<InboxComposeView> {
  return impStream.flatMapLatest(_imp => _imp(driver, threadElPool));
}
