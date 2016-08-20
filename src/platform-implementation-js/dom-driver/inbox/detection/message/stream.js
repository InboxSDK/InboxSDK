/* @flow */

import Kefir from 'kefir';
import udKefir from 'ud-kefir';

import finder from './finder';
import watcher from './watcher';
import parser from './parser';

import detectionRunner from '../../../../lib/dom/detectionRunner';
import type ItemWithLifetimePool from '../../../../lib/ItemWithLifetimePool';
import type InboxDriver from '../../inbox-driver';

const impStream = udKefir(module, imp);

function imp(driver: InboxDriver, threadElPool: ItemWithLifetimePool<*>) {
  return detectionRunner({
    name: 'message',
    finder, watcher: root => watcher(root, threadElPool), parser,
    logError(err: Error, details?: any) {
      driver.getLogger().errorSite(err, details);
    }
  });
}

export default function stream(driver: InboxDriver, threadElPool: ItemWithLifetimePool<*>) {
  return impStream.flatMapLatest(_imp => _imp(driver, threadElPool));
}
