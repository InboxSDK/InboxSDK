/* @flow */
//jshint ignore:start

import {EventEmitter} from 'events';
import Logger from './logger';

// Version of EventEmitter where any exceptions thrown by event handlers are
// caught. This is used to catch exceptions from application code.
export default class SafeEventEmitter extends EventEmitter {
  emit(event: string, ...args: Array<any>): boolean {
    try {
      return super.emit.apply(this, arguments);
    } catch(e) {
      Logger.error(e);
      return true;
    }
  }
}
