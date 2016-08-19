/* @flow */

import type Kefir from 'kefir';
import udKefir from 'ud-kefir';

import finder from './finder';
import watcher from './watcher';
import parser from './parser';

import detectionRunner from '../../../../lib/dom/detectionRunner';
import type ItemWithLifetimePool from '../../../../lib/ItemWithLifetimePool';
import type {ElementWithLifetime} from '../../../../lib/dom/make-element-child-stream';
import type InboxDriver from '../../inbox-driver';

const impStream = udKefir(module, imp);

function imp(driver: InboxDriver, threadRowElPool: ItemWithLifetimePool<ElementWithLifetime>) {
  return detectionRunner({
    name: 'thread',
    finder, watcher: root => watcher(root, threadRowElPool), parser,
    logError(err: Error, details?: any) {
      driver.getLogger().errorSite(err, details);
    }
  });
}

export default function stream(driver: InboxDriver, threadRowElPool: ItemWithLifetimePool<ElementWithLifetime>) {
  return impStream.flatMapLatest(_imp => _imp(driver, threadRowElPool));
}
