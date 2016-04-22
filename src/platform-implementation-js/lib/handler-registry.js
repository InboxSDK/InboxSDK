/* @flow */
//jshint ignore:start

import _ from 'lodash';
import asap from 'asap';
import Logger from './logger';

export type Handler<T> = (target: T) => void;

export default class HandlerRegistry<T> {
  _targets: Array<T> = [];
  _pendingHandlers: Array<Handler<T>> = [];
  _handlers: Array<Handler<T>> = [];

  registerHandler(handler: Handler<T>): () => void {
    if(this._pendingHandlers.indexOf(handler) === -1) {
      this._pendingHandlers.push(handler);

      asap(() => {
        const pendingHandlers = this._pendingHandlers.slice();
        for(let ii=pendingHandlers.length - 1; ii>=0; ii--){
          const handler = pendingHandlers[ii];
          if(this._handlers.indexOf(handler) === -1){
            this._handlers.push(handler);
            this._informHandlerOfTargets(handler);
          }
        }

        this._pendingHandlers = [];
      });
    }

    return () => {
      _.remove(this._pendingHandlers, h => h === handler);
      _.remove(this._handlers, h => h === handler);
    };
  }

  addTarget(target: T) {
    this._targets.push(target);

    if(target.on) {
      target.on('destroy', () => {
        this.removeTarget(target);
      });
    }

    this._informHandlersOfTarget(target);
  }

  removeTarget(target: T) {
    _.remove(this._targets, t => t === target);
  }

  dumpHandlers() {
    this._pendingHandlers = [];
    this._handlers = [];
  }

  _informHandlerOfTargets(handler: Handler<T>) {
    const targets = this._targets.slice();
    for(let ii = 0; ii < targets.length; ii++){
      try{
        handler(targets[ii]);
      } catch(err) {
        Logger.error(err);
      }
    }
  }

  _informHandlersOfTarget(target: T) {
    const handlers = this._handlers.slice();
    for(let ii = 0; ii< handlers.length; ii++){
      try{
        handlers[ii](target);
      } catch(err) {
        Logger.error(err);
      }
    }

  }
}
