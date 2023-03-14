import EventEmitter from '../lib/safe-event-emitter';

// documented in src/docs/
export default class KeyboardShortcutHandle extends EventEmitter {
  chord: string;
  description: string;

  constructor(chord: string, description: string) {
    super();
    this.chord = chord;
    this.description = description;
  }

  remove() {
    this.emit('destroy');
  }
}
