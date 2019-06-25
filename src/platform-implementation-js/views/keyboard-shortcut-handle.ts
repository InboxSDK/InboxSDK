import EventEmitter from '../lib/safe-event-emitter';

// documented in src/docs/
export default class KeyboardShortcutHandle extends EventEmitter {
  public chord: string;
  public description: string;

  public constructor(chord: string, description: string) {
    super();
    this.chord = chord;
    this.description = description;
  }

  public remove() {
    this.emit('destroy');
  }
}
