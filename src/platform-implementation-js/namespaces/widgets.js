/* @flow */

import _ from 'lodash';
import Kefir from 'kefir';
import kefirCast from 'kefir-cast';
import {defn} from 'ud';

import ModalView from '../widgets/modal-view';
import MoleView from '../widgets/mole-view';
import DrawerView from '../widgets/drawer-view';
import TopMessageBarView from '../widgets/top-message-bar-view';
import type {Driver, DrawerViewOptions} from '../driver-interfaces/driver';
import get from '../../common/get-or-fail';

// documented in src/docs/
class Widgets {
  constructor(appId: string, driver: Driver) {
    const members = {driver};
    memberMap.set(this, members);
  }

  showModalView(options: Object): ModalView {
    if (options.buttons) {
      options.buttons = options.buttons.map(button => {
        if (button.onClick) {
          const appOnClick = button.onClick;
          return Object.assign({}, button, {
            onClick() { appOnClick({modalView}); }
          });
        }
        return button;
      });
    }
    const {driver} = get(memberMap, this);
    const modalViewDriver = driver.createModalViewDriver(options);
    const modalView = new ModalView({driver, modalViewDriver});
    modalView.show();

    return modalView;
  }

  showMoleView(options: Object): MoleView {
    var moleViewDriver = get(memberMap, this).driver.createMoleViewDriver(options);
    var moleView = new MoleView({
      moleViewDriver: moleViewDriver
    });
    moleViewDriver.show();

    return moleView;
  }

  showTopMessageBarView(options: Object): TopMessageBarView {
    const topMessageBarViewDriver = get(memberMap, this).driver.createTopMessageBarDriver(kefirCast(Kefir, options));

    return new TopMessageBarView({
      topMessageBarViewDriver
    });
  }

  showDrawerView(options: DrawerViewOptions): DrawerView {
    const drawerViewDriver = get(memberMap, this).driver.createDrawerViewDriver(options);
    return new DrawerView(drawerViewDriver);
  }
}

const memberMap: Map<Widgets, {driver: Driver}> = new Map();

export default defn(module, Widgets);
