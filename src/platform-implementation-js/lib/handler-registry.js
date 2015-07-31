/* @flow */
//jshint ignore:start

import _ from 'lodash';
import asap from 'asap';
import Logger from './logger';

export type Handler<T> = (target: T) => void;

export default class HandlerRegistry<T> {
  _targets: Set<T>;
  _pendingHandlers: Set<Handler<T>>;
  _handlers: Set<Handler<T>>;

  constructor() {
    this._targets = new Set();
    this._pendingHandlers = new Set();
    this._handlers = new Set();
  }

  registerHandler(handler: Handler<T>): () => void {
    this._pendingHandlers.add(handler);

    asap(() => {
      this._pendingHandlers.forEach(handler => {
        this._handlers.add(handler);
        this._informHandlerOfTargets(handler);
      });
      this._pendingHandlers.clear();
    });

    return () => {
      this._pendingHandlers.delete(handler);
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

  dumpHandlers() {
    this._pendingHandlers.clear();
    this._handlers.clear();
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
