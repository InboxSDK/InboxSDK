/* @flow */

import SafeEventEmitter from '../lib/safe-event-emitter';

export default class SimpleElementView extends SafeEventEmitter {
  el: HTMLElement;
  destroyed: boolean = false;

  constructor(el: HTMLElement) {
    super();
    this.el = el;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.emit('destroy');
    this.el.remove();
  }
}
