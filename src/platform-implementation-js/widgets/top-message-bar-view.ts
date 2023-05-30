import get from '../../common/get-or-fail';
import EventEmitter from '../lib/safe-event-emitter';
const memberMap = new WeakMap();
export default class TopMessageBarView extends EventEmitter {
  constructor(options: { topMessageBarViewDriver: Record<string, any> }) {
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
