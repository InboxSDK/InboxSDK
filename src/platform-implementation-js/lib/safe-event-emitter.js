const EventEmitter = require('events').EventEmitter;
import Logger from './logger';

// Version of EventEmitter where any exceptions thrown by event handlers are
// caught. This is used to catch exceptions from application code.
export default class SafeEventEmitter extends EventEmitter {
  emit() {
    try {
      return super.emit.apply(this, arguments);
    } catch(e) {
      Logger.error(e);
    }
  }
}
