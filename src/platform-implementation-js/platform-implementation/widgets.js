/* @flow */

import _ from 'lodash';
import Bacon from 'baconjs';
import baconCast from 'bacon-cast';
import {defn} from 'ud';

import ModalView from '../widgets/modal-view';
import MoleView from '../widgets/mole-view';
import TopMessageBarView from '../widgets/top-message-bar-view';
import type {Driver} from '../driver-interfaces/driver';
import get from '../../common/get-or-fail';

// documented in src/docs/
class Widgets {
  constructor(appId: string, driver: Driver) {
    const members = {driver};
    memberMap.set(this, members);
  }

  showModalView(options: Object): ModalView {
    var modalViewDriver = get(memberMap, this).driver.createModalViewDriver(options);
    var modalView = new ModalView({
      modalViewDriver: modalViewDriver
    });
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
    const topMessageBarViewDriver = get(memberMap, this).driver.createTopMessageBarDriver(baconCast(Bacon, options));

    return new TopMessageBarView({
      topMessageBarViewDriver
    });
  }
}

const memberMap: Map<Widgets, {driver: Driver}> = new Map();

export default defn(module, Widgets);
