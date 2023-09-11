import get from '../../common/get-or-fail';
import HandlerRegistry from '../lib/handler-registry';
import ThreadRowView from '../views/thread-row-view';
import type Membrane from '../lib/Membrane';
import type { Driver } from '../driver-interfaces/driver';
interface Members {
  driver: Driver;
  membrane: Membrane;
  threadRowViewRegistry: HandlerRegistry<ThreadRowView>;
}

const memberMap = new WeakMap<Lists, Members>(); // documented in src/docs/

export default class Lists {
  ActionButtonTypes = ActionButtonTypes;

  constructor(appId: string, driver: Driver, membrane: Membrane) {
    const members = {
      appId,
      driver,
      membrane,
      threadRowViewRegistry: new HandlerRegistry<ThreadRowView>(),
    };
    memberMap.set(this, members);
    driver.getStopper().onValue(() => {
      members.threadRowViewRegistry.dumpHandlers();
    });
    members.driver.getThreadRowViewDriverStream().onValue((viewDriver) => {
      const view = membrane.get(viewDriver);
      members.threadRowViewRegistry.addTarget(view);
    });
  }

  registerThreadRowViewHandler(handler: (...args: Array<any>) => any) {
    return get(memberMap, this).threadRowViewRegistry.registerHandler(handler);
  }

  getSelectedThreadRowViews() {
    const members = get(memberMap, this);
    const threadRowViewDrivers =
      members.driver.getSelectedThreadRowViewDrivers();
    const threadRowViews = threadRowViewDrivers.map((d) =>
      members.membrane.get(d),
    );
    return threadRowViews;
  }

  registerThreadRowViewSelectionHandler(handler: () => any) {
    const members = get(memberMap, this);
    return members.driver.registerThreadRowViewSelectionHandler(handler);
  }
}
const ActionButtonTypes = Object.freeze({
  LINK: 'LINK',
  DROPDOWN: 'DROPDOWN',
  ACTION: 'ACTION',
});
