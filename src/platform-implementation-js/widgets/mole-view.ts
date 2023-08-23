import type TypedEventEmitter from 'typed-emitter';
import get from '../../common/get-or-fail';
import EventEmitter from '../lib/safe-event-emitter';
import type GmailMoleViewDriver from '../dom-driver/gmail/widgets/gmail-mole-view-driver';

const memberMap = new WeakMap<MoleView, { driver: GmailMoleViewDriver }>();

type MoleViewEvent = {
  destroy(): void;
  minimize(): void;
  restore(): void;
};

export interface IMoleView extends TypedEventEmitter<MoleViewEvent> {
  close(): void;
  getMinimized(): boolean;
  setMinimized(value: boolean): void;
  setTitle(title: string): void;
}

export default class MoleView
  extends (EventEmitter as new () => TypedEventEmitter<MoleViewEvent>)
  implements IMoleView
{
  destroyed: boolean = false;

  constructor(options: { moleViewDriver: GmailMoleViewDriver }) {
    super();
    const members = {
      driver: options.moleViewDriver,
    };
    memberMap.set(this, members);
    members.driver.getEventStream().onValue((e) => {
      this.emit(e.eventName);
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
