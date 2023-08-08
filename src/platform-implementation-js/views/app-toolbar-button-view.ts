import EventEmitter from '../lib/safe-event-emitter';
import get from '../../common/get-or-fail';
import type { Driver } from '../driver-interfaces/driver';
import type AppToolbarButtonViewDriver from '../dom-driver/gmail/views/gmail-app-toolbar-button-view';
import type { AppToolbarButtonView as IAppToolbarButtonView } from '../../inboxsdk';
import TypedEventEmitter from 'typed-emitter';
const memberMap = new WeakMap(); // Documented in src/docs/app-toolbar-button-view.js

export default class AppToolbarButtonView
  extends (EventEmitter as new () => TypedEventEmitter<{ destroy: () => void }>)
  implements IAppToolbarButtonView
{
  destroyed: boolean;

  constructor(
    driver: Driver,
    appToolbarButtonViewDriverPromise: Promise<AppToolbarButtonViewDriver>
  ) {
    super();
    const members = {
      appToolbarButtonViewDriverPromise,
      appToolbarButtonViewDriver: null as
        | AppToolbarButtonViewDriver
        | null
        | undefined,
    };
    memberMap.set(this, members);
    this.destroyed = false;
    members.appToolbarButtonViewDriverPromise.then(
      (appToolbarButtonViewDriver) => {
        members.appToolbarButtonViewDriver = appToolbarButtonViewDriver;
        appToolbarButtonViewDriver.getStopper().onValue(() => {
          this.destroyed = true;
          this.emit('destroy');
        });
      }
    );
    driver.getStopper().onValue(() => {
      this.remove();
    });
  }

  open() {
    const members = get(memberMap, this);
    members.appToolbarButtonViewDriverPromise.then(function (
      appToolbarButtonViewDriver: AppToolbarButtonViewDriver
    ) {
      appToolbarButtonViewDriver.open();
    });
  }

  close() {
    const members = get(memberMap, this);
    members.appToolbarButtonViewDriverPromise.then(function (
      appToolbarButtonViewDriver: AppToolbarButtonViewDriver
    ) {
      appToolbarButtonViewDriver.close();
    });
  }

  remove() {
    const members = get(memberMap, this);
    members.appToolbarButtonViewDriverPromise.then(function (
      appToolbarButtonViewDriver: AppToolbarButtonViewDriver
    ) {
      appToolbarButtonViewDriver.destroy();
    });
  }
}
