/* @flow */
//jshint ignore:start

import _ from 'lodash';
import asap from 'asap';
import Logger from './logger';

export type Handler<T> = (target: T) => void;

export default class HandlerRegistry<T> {
  _targets: Set<T>;
  _handlers: Set<Handler<T>>;

  constructor() {
    this._targets = new Set();
    this._handlers = new Set();
  }

  registerHandler(handler: Handler<T>): () => void {
    var unsubbed = false;
    asap(() => {
      if (unsubbed) return;
      this._handlers.add(handler);
      this._informHandlerOfTargets(handler);
    });

    return () => {
      unsubbed = true;
      this._handlers.delete(handler);
    };
  }

  addTarget(target: T) {
    this._targets.add(target);

    if(target.on) {
      target.on('destroy', () => {
        this.removeTarget(target);
      });
    }

    this._informHandlersOfTarget(target);
  }

  removeTarget(target: T) {
    this._targets.delete(target);
  }

  _informHandlerOfTargets(handler: Handler<T>) {
    this._targets.forEach(function(target) {
      try {
        handler(target);
      } catch(err) {
        Logger.error(err);
      }
    });
  }

  _informHandlersOfTarget(target: T) {
    this._handlers.forEach(function(handler){
      try {
        handler(target);
      } catch(err) {
        Logger.error(err);
      }
    });
  }
}
