/* @flow */

import {defn} from 'ud';
import EventEmitter from '../lib/safe-event-emitter';

// documented in src/docs/
class KeyboardShortcutHandle extends EventEmitter {
  chord: string;
  description: string;

  constructor(chord: string, description: string) {
    super();
    this.chord = chord;
    this.description = description;
  }

  remove(){
    this.emit('destroy');
  }
}

export default defn(module, KeyboardShortcutHandle);
