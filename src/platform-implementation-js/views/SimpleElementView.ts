import SafeEventEmitter from '../lib/safe-event-emitter';

export default class SimpleElementView extends SafeEventEmitter {
  public el: HTMLElement;
  public destroyed: boolean = false;

  public constructor(el: HTMLElement) {
    super();
    this.el = el;
  }

  public destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.emit('destroy');
    this.el.remove();
  }
}
