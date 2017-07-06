/* @flow */

import get from '../../common/get-or-fail';
import EventEmitter from '../lib/safe-event-emitter';

const memberMap = new WeakMap();

// documented in src/docs/
export default class MoleView extends EventEmitter {
  destroyed: boolean = false;

  constructor(options: {moleViewDriver: Object}) {
    super();
    const members = {
      driver: options.moleViewDriver
    };
    memberMap.set(this, members);

    members.driver.getEventStream().onValue(e => {
      this.emit(e.eventName, e.detail);
    });
    members.driver.getEventStream().onEnd(() => {
      this.destroyed = true;
      this.emit('destroy');
    });
  }

  close() {
    const members = get(memberMap, this);
    members.driver.destroy();
  }

  setTitle(text: string) {
    const members = get(memberMap, this);
    members.driver.setTitle(text);
  }

  setMinimized(minimized: boolean) {
    const members = get(memberMap, this);
    members.driver.setMinimized(minimized);
  }

  getMinimized() {
    const members = get(memberMap, this);
    return members.driver.getMinimized();
  }
}
