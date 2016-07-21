/* @flow */

import _ from 'lodash';
import Kefir from 'kefir';
import udKefir from 'ud-kefir';
import type InboxDriver from './inbox-driver';

import finder from './detection/nativeDrawer/finder';
import parser from './detection/nativeDrawer/parser';

import detectionRunner from '../../lib/dom/detectionRunner';

const impStream = udKefir(module, imp);

function imp(driver: InboxDriver) {
  return detectionRunner({
    name: 'nativeDrawer',
    finder, watcher: null, parser,
    logError(err: Error, details?: any) {
      driver.getLogger().errorSite(err, details);
    }
  });
}

export default function getNativeDrawerStream(driver: InboxDriver) {
  return impStream.flatMapLatest(_imp => _imp(driver));
}
