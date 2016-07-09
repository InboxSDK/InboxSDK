/* @flow */
//jshint ignore:start

import _ from 'lodash';
import Kefir from 'kefir';
import udKefir from 'ud-kefir';
import type InboxDriver from './inbox-driver';

import finder from './detection/appToolbarLocation/finder';
import parser from './detection/appToolbarLocation/parser';

import detectionRunner from '../../lib/dom/detectionRunner';

const impStream = udKefir(module, imp);

function imp(driver: InboxDriver) {
  return detectionRunner({
    name: 'appToolbarLocation',
    finder, watcher: null, parser,
    interval: (count, timeRunning) =>
      (count === 0 && timeRunning < 60*1000) ? 300 : 2*60*1000,
    logError(err: Error, details?: any) {
      driver.getLogger().errorSite(err, details);
    }
  });
}

export default function getAppToolbarLocationStream(driver: InboxDriver) {
  return impStream.flatMapLatest(_imp => _imp(driver));
}
