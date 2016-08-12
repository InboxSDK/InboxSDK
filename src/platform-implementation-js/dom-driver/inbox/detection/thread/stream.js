/* @flow */

import udKefir from 'ud-kefir';

import finder from './finder';
import watcher from './watcher';
import parser from './parser';

import detectionRunner from '../../../../lib/dom/detectionRunner';
import type InboxDriver from '../../inbox-driver';

const impStream = udKefir(module, imp);

function imp(driver: InboxDriver) {
  return detectionRunner({
    name: 'thread',
    finder, watcher, parser,
    logError(err: Error, details?: any) {
      driver.getLogger().errorSite(err, details);
    }
  });
}

export default function stream(driver: InboxDriver) {
  return impStream.flatMapLatest(_imp => _imp(driver));
}
