import EventEmitter from '../lib/safe-event-emitter';

export default class KeyboardShortcutHandle extends EventEmitter {
  chord: string;
  description: string;
  orderHint?: number;

  constructor(chord: string, description: string, orderHint?: number) {
    super();
    this.chord = chord;
    this.description = description;
    this.orderHint = orderHint;
  }

  remove() {
    this.emit('destroy');
  }
}
