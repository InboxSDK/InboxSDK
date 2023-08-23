import get from '../../common/get-or-fail';
import type GmailTopMessageBarDriver from '../dom-driver/gmail/widgets/gmail-top-message-bar-driver';
import EventEmitter from '../lib/safe-event-emitter';

const memberMap = new WeakMap<
  TopMessageBarView,
  { driver: GmailTopMessageBarDriver }
>();

export default class TopMessageBarView extends EventEmitter {
  constructor(options: { topMessageBarViewDriver: GmailTopMessageBarDriver }) {
    super();
    const members = {
      driver: options.topMessageBarViewDriver,
    };
    memberMap.set(this, members);
  }

  remove() {
    get(memberMap, this).driver.remove();
  }
}
