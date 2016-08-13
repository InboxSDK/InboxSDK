/* @flow */

import type Kefir from 'kefir';
import udKefir from 'ud-kefir';

import finder from './finder';
import watcher from './watcher';
import parser from './parser';

import detectionRunner from '../../../../lib/dom/detectionRunner';
import type {ElementWithLifetime} from '../../../../lib/dom/make-element-child-stream';
import type InboxDriver from '../../inbox-driver';

const impStream = udKefir(module, imp);

function imp(driver: InboxDriver, threadRowElStream: Kefir.Stream<ElementWithLifetime>) {
  return detectionRunner({
    name: 'thread',
    finder, watcher: root => watcher(root, threadRowElStream), parser,
    logError(err: Error, details?: any) {
      driver.getLogger().errorSite(err, details);
    }
  });
}

export default function stream(driver: InboxDriver, threadRowElStream: Kefir.Stream<ElementWithLifetime>) {
  return impStream.flatMapLatest(_imp => _imp(driver, threadRowElStream));
}
