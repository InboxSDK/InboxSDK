import remove from 'lodash/remove';
import asap from 'asap';
import Logger from './logger';

export type Handler<T> = (target: T) => void;

export default class HandlerRegistry<T> {
  private _targets: Array<T> = [];
  private _pendingHandlers: Array<Handler<T>> = [];
  private _handlers: Array<Handler<T>> = [];

  public registerHandler(handler: Handler<T>): () => void {
    if (this._pendingHandlers.indexOf(handler) === -1) {
      this._pendingHandlers.push(handler);

      asap(() => {
        const pendingHandlers = this._pendingHandlers.slice();
        for (let ii = pendingHandlers.length - 1; ii >= 0; ii--) {
          const handler = pendingHandlers[ii];
          if (this._handlers.indexOf(handler) === -1) {
            this._handlers.push(handler);
            this._informHandlerOfTargets(handler);
          }
        }

        this._pendingHandlers = [];
      });
    }

    return () => {
      remove(this._pendingHandlers, h => h === handler);
      remove(this._handlers, h => h === handler);
    };
  }

  public addTarget(target: T) {
    this._targets.push(target);

    // TODO should we error if an object without an .on method is added?
    if (
      target &&
      typeof target === 'object' &&
      typeof (target as any).on === 'function'
    ) {
      (target as any).on('destroy', () => {
        this.removeTarget(target);
      });
    }

    this._informHandlersOfTarget(target);
  }

  public removeTarget(target: T) {
    remove(this._targets, t => t === target);
  }

  public dumpHandlers() {
    this._pendingHandlers = [];
    this._handlers = [];
  }

  private _informHandlerOfTargets(handler: Handler<T>) {
    const targets = this._targets.slice();
    for (let ii = 0; ii < targets.length; ii++) {
      _tryCatch(handler, targets[ii]);
    }
  }

  private _informHandlersOfTarget(target: T) {
    const handlers = this._handlers.slice();
    for (let ii = 0; ii < handlers.length; ii++) {
      _tryCatch(handlers[ii], target);
    }
  }
}

function _tryCatch<T>(fn: (arg: T) => void, arg: T) {
  try {
    fn(arg);
  } catch (err) {
    Logger.error(err);
  }
}
