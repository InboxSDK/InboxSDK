/* @flow */

import _ from 'lodash';
import Kefir from 'kefir';
import udKefir from 'ud-kefir';
// import InboxChatSidebarView from './views/inbox-chat-sidebar-view';
import type InboxDriver from './inbox-driver';

import finder from './detection/chatSidebar/finder';
import watcher from './detection/chatSidebar/watcher';
import parser from './detection/chatSidebar/parser';

import detectionRunner from '../../lib/dom/detectionRunner';

const impStream = udKefir(module, imp);

function imp(driver: InboxDriver): Kefir.Observable<any> {
  return detectionRunner({
    name: 'chatSidebar',
    finder, watcher, parser,
    interval: count => count === 0 ? 5*1000 : 120*1000,
    logError(err: Error, details?: any) {
      driver.getLogger().errorSite(err, details);
    }
  })
    .flatMap(({el, removalStream, parsed}) => {
      console.log('chatSidebar', el, parsed);
      removalStream.take(1).onValue(() => {
        console.log('removed chatSidebar');
      });
      return Kefir.never();
    });
}

export default function getChatSidebarViewStream(driver: InboxDriver): Kefir.Observable<any> {
  return impStream.flatMapLatest(_imp => _imp(driver));
}
